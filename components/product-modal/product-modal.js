/**
 * Product Modal Component
 * @file product-modal.js
 * @description Modal for selecting products from a category
 */

import stateManager from '../shared/state-manager.js';
import { konimboAPI } from '../../integration/konimbo-api.js';
import { EVENTS, CSS_CLASSES } from '../shared/constants.js';
import { DOM, Num, Str, Fn, log } from '../shared/utils.js';

class ProductModal {
  constructor(rootElement) {
    this.root = typeof rootElement === 'string'
      ? document.querySelector(rootElement)
      : rootElement;

    if (!this.root) {
      throw new Error('ProductModal: Root element not found');
    }

    this.productGridEl = null;
    this.productCardTemplate = null;
    this.searchInput = null;
    this.sortSelect = null;
    this.inStockCheckbox = null;

    this.filteredProducts = [];

    this.init();
  }

  /**
   * Initialize component
   */
  init() {
    log.debug('ProductModal: Initializing');

    // Get elements
    this.modalTitleEl = this.root.querySelector('#modal-title');
    this.productGridEl = this.root.querySelector('#product-grid');
    this.productsEmptyEl = this.root.querySelector('#products-empty');
    this.productsLoadingEl = this.root.querySelector('#products-loading');
    this.searchInput = this.root.querySelector('#product-search');
    this.sortSelect = this.root.querySelector('#product-sort');
    this.inStockCheckbox = this.root.querySelector('#filter-in-stock');

    // Get template
    this.productCardTemplate = document.querySelector('#product-card-template');

    // Subscribe to state changes
    this.unsubscribe = stateManager.subscribe(this.handleStateChange.bind(this));

    // Add event listeners
    this.attachEventListeners();

    log.debug('ProductModal: Initialized');
  }

  /**
   * Handle state changes
   * @param {Object} state
   * @param {Object} prevState
   */
  handleStateChange(state, prevState) {
    // Open/close modal
    if (state.ui.isModalOpen !== prevState.ui.isModalOpen) {
      if (state.ui.isModalOpen && state.ui.modalType === 'product') {
        this.open();
      } else {
        this.close();
      }
    }

    // Load products when category changes
    if (state.currentCategory !== prevState.currentCategory && state.currentCategory) {
      this.loadProducts(state.currentCategory.id);
    }

    // Render products when they change
    if (state.currentCategoryProducts !== prevState.currentCategoryProducts) {
      this.renderProducts();
    }

    // Update loading state
    if (state.loading.products !== prevState.loading.products) {
      this.toggleLoading(state.loading.products);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close modal
    const closeButtons = this.root.querySelectorAll('[data-action="close-modal"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.handleClose());
    });

    // Product selection
    this.productGridEl.addEventListener('click', (e) => {
      const selectBtn = e.target.closest('[data-action="select-product"]');
      if (selectBtn) {
        const productCard = selectBtn.closest('.product-card');
        const productId = parseInt(productCard.dataset.productId);
        this.handleProductSelect(productId);
      }
    });

    // Search
    this.searchInput.addEventListener('input', Fn.debounce((e) => {
      this.handleSearch(e.target.value);
    }, 300));

    // Sort
    this.sortSelect.addEventListener('change', (e) => {
      this.handleSort(e.target.value);
    });

    // In stock filter
    this.inStockCheckbox.addEventListener('change', (e) => {
      this.handleInStockFilter(e.target.checked);
    });

    // Prevent modal close on content click
    const container = this.root.querySelector('.product-modal__container');
    container.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  /**
   * Open modal
   */
  open() {
    log.debug('ProductModal: Opening');

    DOM.show(this.root);
    document.body.style.overflow = 'hidden';

    // Set title
    const state = stateManager.getState();
    if (state.currentCategory) {
      this.modalTitleEl.textContent = `בחר ${state.currentCategory.displayName}`;
    }

    // Reset search and filters
    this.searchInput.value = '';
    this.sortSelect.value = 'popularity';
    this.inStockCheckbox.checked = false;
  }

  /**
   * Close modal
   */
  close() {
    log.debug('ProductModal: Closing');

    DOM.hide(this.root);
    document.body.style.overflow = '';
  }

  /**
   * Handle modal close
   */
  handleClose() {
    stateManager.closeModal();
  }

  /**
   * Load products for category
   * @param {number} categoryId
   */
  async loadProducts(categoryId) {
    log.debug('ProductModal: Loading products for category', categoryId);

    stateManager.setLoading('products', true);

    try {
      const products = await konimboAPI.getProductsByCategory(categoryId);
      stateManager.setCurrentCategoryProducts(products);
    } catch (error) {
      log.error('ProductModal: Error loading products', error);
      stateManager.setError({
        hasError: true,
        message: 'שגיאה בטעינת מוצרים. אנא נסה שוב.',
        code: 'PRODUCTS_LOAD_ERROR'
      });
    } finally {
      stateManager.setLoading('products', false);
    }
  }

  /**
   * Render products
   */
  renderProducts() {
    const state = stateManager.getState();
    let products = state.currentCategoryProducts || [];

    // Apply search filter
    if (state.ui.searchQuery) {
      products = this.filterBySearch(products, state.ui.searchQuery);
    }

    // Apply in-stock filter
    if (state.ui.filters.inStock) {
      products = products.filter(p => p.inStock);
    }

    // Sort products
    products = this.sortProducts(products, state.ui.sortBy);

    this.filteredProducts = products;

    // Clear grid
    DOM.empty(this.productGridEl);

    if (products.length === 0) {
      DOM.show(this.productsEmptyEl);
      return;
    }

    DOM.hide(this.productsEmptyEl);

    // Render each product
    products.forEach(product => {
      const productEl = this.createProductCard(product);
      this.productGridEl.appendChild(productEl);
    });
  }

  /**
   * Create product card element
   * @param {Object} product
   * @returns {HTMLElement}
   */
  createProductCard(product) {
    const clone = this.productCardTemplate.content.cloneNode(true);
    const cardEl = clone.querySelector('.product-card');

    // Set product data
    cardEl.dataset.productId = product.id;

    // Set image
    const imgEl = cardEl.querySelector('.product-card__image');
    if (product.primaryImage) {
      imgEl.src = product.primaryImage;
      imgEl.alt = product.name;
    } else {
      imgEl.src = '/images/no-image.png'; // Placeholder
      imgEl.alt = 'No image';
    }

    // Set name
    const nameEl = cardEl.querySelector('.product-card__name');
    nameEl.textContent = product.name;

    // Set SKU
    const skuEl = cardEl.querySelector('.product-card__sku');
    skuEl.textContent = `קוד: ${product.sku}`;

    // Set price
    const priceEl = cardEl.querySelector('.product-card__price');
    priceEl.textContent = Num.formatPrice(product.price);

    // Set original price if on sale
    if (product.onSale) {
      const originalPriceEl = cardEl.querySelector('.product-card__original-price');
      originalPriceEl.textContent = Num.formatPrice(product.originalPrice);
      DOM.show(originalPriceEl);

      // Show sale badge
      const saleBadge = cardEl.querySelector('.badge--sale');
      DOM.show(saleBadge);
    }

    // Show out of stock badge
    if (!product.inStock) {
      const outOfStockBadge = cardEl.querySelector('.badge--out-of-stock');
      DOM.show(outOfStockBadge);

      // Disable select button
      const selectBtn = cardEl.querySelector('[data-action="select-product"]');
      selectBtn.disabled = true;
      selectBtn.textContent = 'אזל מהמלאי';
    }

    return cardEl;
  }

  /**
   * Handle product selection
   * @param {number} productId
   */
  handleProductSelect(productId) {
    log.debug('ProductModal: Product selected', productId);

    const product = this.filteredProducts.find(p => p.id === productId);

    if (!product) {
      log.error('ProductModal: Product not found', productId);
      return;
    }

    if (!product.inStock) {
      alert('מוצר זה אינו במלאי');
      return;
    }

    const state = stateManager.getState();
    const categoryId = state.currentCategory.id;

    // Add product to configuration
    stateManager.addProduct(product, categoryId, 1);

    // Close modal
    this.handleClose();
  }

  /**
   * Handle search
   * @param {string} query
   */
  handleSearch(query) {
    log.debug('ProductModal: Search', query);
    stateManager.setSearchQuery(query);
    this.renderProducts();
  }

  /**
   * Handle sort
   * @param {string} sortBy
   */
  handleSort(sortBy) {
    log.debug('ProductModal: Sort by', sortBy);
    stateManager.setSortBy(sortBy);
    this.renderProducts();
  }

  /**
   * Handle in-stock filter
   * @param {boolean} checked
   */
  handleInStockFilter(checked) {
    log.debug('ProductModal: In-stock filter', checked);
    stateManager.setFilters({ inStock: checked });
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
      const desc = (product.description || '').toLowerCase();

      return name.includes(lowerQuery) ||
             sku.includes(lowerQuery) ||
             desc.includes(lowerQuery);
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

      case 'name_asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));

      case 'name_desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));

      default:
        return sorted;
    }
  }

  /**
   * Toggle loading state
   * @param {boolean} loading
   */
  toggleLoading(loading) {
    if (loading) {
      DOM.show(this.productsLoadingEl);
      DOM.hide(this.productGridEl);
      DOM.hide(this.productsEmptyEl);
    } else {
      DOM.hide(this.productsLoadingEl);
      DOM.show(this.productGridEl);
    }
  }

  /**
   * Destroy component
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    document.body.style.overflow = '';
    log.debug('ProductModal: Destroyed');
  }
}

export default ProductModal;
