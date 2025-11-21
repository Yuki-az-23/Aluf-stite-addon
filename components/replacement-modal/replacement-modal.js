/**
 * Replacement Modal Component
 * @file replacement-modal.js
 * @description Modal for selecting replacement products when items are out of stock
 */

import stateManager from '../shared/state-manager.js';
import { konimboAPI } from '../../integration/konimbo-api.js';
import compatibilityChecker from '../shared/compatibility-checker.js';
import specParser from '../shared/spec-parser.js';
import { DOM, Num, Str, Fn, log } from '../shared/utils.js';

class ReplacementModal {
  constructor(rootElement) {
    this.root = typeof rootElement === 'string'
      ? document.querySelector(rootElement)
      : rootElement;

    if (!this.root) {
      throw new Error('ReplacementModal: Root element not found');
    }

    this.productsGridEl = null;
    this.productCardTemplate = null;
    this.searchInput = null;
    this.sortSelect = null;
    this.priceFilterCheckbox = null;

    this.originalProduct = null;
    this.categoryId = null;
    this.configuration = null;
    this.allReplacements = [];
    this.filteredReplacements = [];

    this.onSelectCallback = null;
    this.onSkipCallback = null;
    this.onCancelCallback = null;

    this.init();
  }

  /**
   * Initialize component
   */
  init() {
    log.debug('ReplacementModal: Initializing');

    // Get elements
    this.outOfStockProductEl = this.root.querySelector('#out-of-stock-product');
    this.productsGridEl = this.root.querySelector('#replacement-products-grid');
    this.emptyEl = this.root.querySelector('#replacement-empty');
    this.loadingEl = this.root.querySelector('#replacement-loading');
    this.searchInput = this.root.querySelector('#replacement-search');
    this.sortSelect = this.root.querySelector('#replacement-sort');
    this.priceFilterCheckbox = this.root.querySelector('#replacement-filter-price');

    // Get template
    this.productCardTemplate = document.querySelector('#replacement-product-card-template');

    // Add event listeners
    this.attachEventListeners();

    log.debug('ReplacementModal: Initialized');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close modal
    const closeButtons = this.root.querySelectorAll('[data-action="close-replacement-modal"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.handleClose());
    });

    // Product selection
    this.productsGridEl.addEventListener('click', (e) => {
      const selectBtn = e.target.closest('[data-action="select-replacement"]');
      if (selectBtn) {
        const productCard = selectBtn.closest('.replacement-product-card');
        const productId = parseInt(productCard.dataset.productId);
        this.handleProductSelect(productId);
      }
    });

    // Skip replacement
    const skipBtn = this.root.querySelector('[data-action="skip-replacement"]');
    skipBtn.addEventListener('click', () => this.handleSkip());

    // Cancel load
    const cancelBtn = this.root.querySelector('[data-action="cancel-load"]');
    cancelBtn.addEventListener('click', () => this.handleCancel());

    // Search
    this.searchInput.addEventListener('input', Fn.debounce((e) => {
      this.handleSearch(e.target.value);
    }, 300));

    // Sort
    this.sortSelect.addEventListener('change', (e) => {
      this.handleSort(e.target.value);
    });

    // Price filter
    this.priceFilterCheckbox.addEventListener('change', () => {
      this.renderProducts();
    });

    // Prevent modal close on content click
    const container = this.root.querySelector('.replacement-modal__container');
    container.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Open modal with out-of-stock product
   * @param {Object} originalProduct - The out-of-stock product
   * @param {number} categoryId - Category ID
   * @param {Object} configuration - Current configuration
   * @param {Function} onSelect - Callback when replacement selected
   * @param {Function} onSkip - Callback when skipped
   * @param {Function} onCancel - Callback when cancelled
   */
  async open(originalProduct, categoryId, configuration, onSelect, onSkip, onCancel) {
    log.debug('ReplacementModal: Opening for product', originalProduct.name);

    this.originalProduct = originalProduct;
    this.categoryId = categoryId;
    this.configuration = configuration;
    this.onSelectCallback = onSelect;
    this.onSkipCallback = onSkip;
    this.onCancelCallback = onCancel;

    DOM.show(this.root);
    document.body.style.overflow = 'hidden';

    // Set out-of-stock product info
    this.outOfStockProductEl.textContent = `${originalProduct.name} (${originalProduct.sku})`;

    // Reset filters
    this.searchInput.value = '';
    this.sortSelect.value = 'similarity';
    this.priceFilterCheckbox.checked = true;

    // Load replacement products
    await this.loadReplacements();
  }

  /**
   * Close modal
   */
  close() {
    log.debug('ReplacementModal: Closing');

    DOM.hide(this.root);
    document.body.style.overflow = '';

    // Reset state
    this.originalProduct = null;
    this.categoryId = null;
    this.configuration = null;
    this.allReplacements = [];
    this.filteredReplacements = [];
  }

  /**
   * Handle modal close
   */
  handleClose() {
    this.close();
  }

  /**
   * Load replacement products
   */
  async loadReplacements() {
    DOM.show(this.loadingEl);
    DOM.hide(this.productsGridEl);
    DOM.hide(this.emptyEl);

    try {
      // Get all products from same category
      let products = await konimboAPI.getProductsByCategory(this.categoryId);

      // Parse specifications
      products = products.map(product => {
        const productWithSpecs = { ...product };
        productWithSpecs.specifications = specParser.parseByCategory(product, this.categoryId);
        return productWithSpecs;
      });

      // Filter to compatible and in-stock products only
      const state = stateManager.getState();
      const categories = state.categories;

      products = products.filter(product => {
        // Exclude original product
        if (product.id === this.originalProduct.id) {
          return false;
        }

        // Must be in stock
        if (!product.inStock) {
          return false;
        }

        // Must be compatible with current configuration
        return compatibilityChecker.isProductCompatible(
          product,
          this.categoryId,
          this.configuration,
          categories
        );
      });

      // Calculate similarity scores
      products = products.map(product => {
        const similarity = this.calculateSimilarity(product, this.originalProduct);
        return { ...product, similarityScore: similarity };
      });

      this.allReplacements = products;
      this.renderProducts();
    } catch (error) {
      log.error('ReplacementModal: Error loading replacements', error);
      DOM.hide(this.loadingEl);
      DOM.show(this.emptyEl);
    } finally {
      DOM.hide(this.loadingEl);
    }
  }

  /**
   * Calculate similarity between two products
   * @param {Object} product1
   * @param {Object} product2
   * @returns {number} Similarity score (0-100)
   */
  calculateSimilarity(product1, product2) {
    let score = 0;

    // Price similarity (40 points max)
    const priceDiff = Math.abs(product1.price - product2.price);
    const priceRatio = priceDiff / product2.price;
    score += Math.max(0, 40 * (1 - priceRatio));

    // Manufacturer match (20 points)
    if (product1.manufacturer && product2.manufacturer &&
        product1.manufacturer === product2.manufacturer) {
      score += 20;
    }

    // Specification similarity (40 points max)
    if (product1.specifications && product2.specifications) {
      const specs1 = product1.specifications;
      const specs2 = product2.specifications;

      let matchingSpecs = 0;
      let totalSpecs = 0;

      // Compare common spec fields
      const specFields = ['socket', 'memoryType', 'formFactor', 'wattage', 'tdp'];

      specFields.forEach(field => {
        if (specs2[field] !== undefined) {
          totalSpecs++;
          if (specs1[field] === specs2[field]) {
            matchingSpecs++;
          }
        }
      });

      if (totalSpecs > 0) {
        score += 40 * (matchingSpecs / totalSpecs);
      }
    }

    return Math.round(score);
  }

  /**
   * Render products
   */
  renderProducts() {
    let products = [...this.allReplacements];

    // Apply price filter
    if (this.priceFilterCheckbox.checked) {
      const originalPrice = this.originalProduct.price;
      const minPrice = originalPrice * 0.8;
      const maxPrice = originalPrice * 1.2;

      products = products.filter(p => p.price >= minPrice && p.price <= maxPrice);
    }

    // Apply search filter
    if (this.searchInput.value) {
      products = this.filterBySearch(products, this.searchInput.value);
    }

    // Sort products
    products = this.sortProducts(products, this.sortSelect.value);

    this.filteredReplacements = products;

    // Clear grid
    DOM.empty(this.productsGridEl);

    if (products.length === 0) {
      DOM.show(this.emptyEl);
      DOM.hide(this.productsGridEl);
      return;
    }

    DOM.hide(this.emptyEl);
    DOM.show(this.productsGridEl);

    // Render each product
    products.forEach((product, index) => {
      const productEl = this.createProductCard(product, index === 0);
      this.productsGridEl.appendChild(productEl);
    });
  }

  /**
   * Create product card element
   * @param {Object} product
   * @param {boolean} isRecommended
   * @returns {HTMLElement}
   */
  createProductCard(product, isRecommended) {
    const clone = this.productCardTemplate.content.cloneNode(true);
    const cardEl = clone.querySelector('.replacement-product-card');

    // Set product data
    cardEl.dataset.productId = product.id;

    // Set image
    const imgEl = cardEl.querySelector('.replacement-product-card__image');
    if (product.primaryImage) {
      imgEl.src = product.primaryImage;
      imgEl.alt = product.name;
    } else {
      imgEl.src = '/images/no-image.png';
      imgEl.alt = 'No image';
    }

    // Show recommended badge for first item
    if (isRecommended) {
      const recommendedBadge = cardEl.querySelector('.badge--recommended');
      DOM.show(recommendedBadge);
    }

    // Set name
    const nameEl = cardEl.querySelector('.replacement-product-card__name');
    nameEl.textContent = product.name;

    // Set SKU
    const skuEl = cardEl.querySelector('.replacement-product-card__sku');
    skuEl.textContent = `קוד: ${product.sku}`;

    // Set price comparison
    const originalPriceEl = cardEl.querySelector('.price-comparison__original');
    originalPriceEl.textContent = Num.formatPrice(this.originalProduct.price);

    const newPriceEl = cardEl.querySelector('.price-comparison__new');
    newPriceEl.textContent = Num.formatPrice(product.price);

    const priceDiffEl = cardEl.querySelector('.price-diff');
    const diff = product.price - this.originalProduct.price;

    if (diff > 0) {
      priceDiffEl.textContent = `+${Num.formatPrice(diff)}`;
      priceDiffEl.classList.add('price-diff--higher');
    } else if (diff < 0) {
      priceDiffEl.textContent = Num.formatPrice(diff);
      priceDiffEl.classList.add('price-diff--lower');
    } else {
      priceDiffEl.textContent = 'זהה';
      priceDiffEl.classList.add('price-diff--same');
    }

    return cardEl;
  }

  /**
   * Handle product selection
   * @param {number} productId
   */
  handleProductSelect(productId) {
    const product = this.filteredReplacements.find(p => p.id === productId);

    if (!product) {
      log.error('ReplacementModal: Product not found', productId);
      return;
    }

    log.debug('ReplacementModal: Replacement selected', product.name);

    if (this.onSelectCallback) {
      this.onSelectCallback(product);
    }

    this.close();
  }

  /**
   * Handle skip (remove product)
   */
  handleSkip() {
    log.debug('ReplacementModal: Skipped replacement');

    if (this.onSkipCallback) {
      this.onSkipCallback();
    }

    this.close();
  }

  /**
   * Handle cancel (abort configuration load)
   */
  handleCancel() {
    log.debug('ReplacementModal: Cancelled configuration load');

    if (this.onCancelCallback) {
      this.onCancelCallback();
    }

    this.close();
  }

  /**
   * Handle search
   * @param {string} query
   */
  handleSearch(query) {
    this.renderProducts();
  }

  /**
   * Handle sort
   * @param {string} sortBy
   */
  handleSort(sortBy) {
    this.renderProducts();
  }

  /**
   * Filter products by search query
   * @param {Array} products
   * @param {string} query
   * @returns {Array}
   */
  filterBySearch(products, query) {
    const lowerQuery = query.toLowerCase();

    return products.filter(product => {
      const name = (product.name || '').toLowerCase();
      const sku = (product.sku || '').toLowerCase();

      return name.includes(lowerQuery) || sku.includes(lowerQuery);
    });
  }

  /**
   * Sort products
   * @param {Array} products
   * @param {string} sortBy
   * @returns {Array}
   */
  sortProducts(products, sortBy) {
    const sorted = [...products];

    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);

      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);

      case 'similarity':
        return sorted.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));

      default:
        return sorted;
    }
  }

  /**
   * Destroy component
   */
  destroy() {
    document.body.style.overflow = '';
    log.debug('ReplacementModal: Destroyed');
  }
}

export default ReplacementModal;
