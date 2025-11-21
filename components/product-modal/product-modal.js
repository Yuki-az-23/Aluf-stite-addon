/**
 * Product Modal Component
 * @file product-modal.js
 * @description Modal for selecting products from a category
 */

import stateManager from '../shared/state-manager.js';
import { konimboAPI } from '../../integration/konimbo-api.js';
import compatibilityChecker from '../shared/compatibility-checker.js';
import specParser from '../shared/spec-parser.js';
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
    this.filterGroupTemplate = null;
    this.filterOptionTemplate = null;
    this.filtersEl = null;
    this.searchInput = null;
    this.sortSelect = null;
    this.inStockCheckbox = null;
    this.compatibleCheckbox = null;

    this.filteredProducts = [];
    this.allProducts = [];
    this.activeFilters = {}; // { manufacturer: ['Intel', 'AMD'], memoryType: ['DDR5'] }

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
    this.filtersEl = this.root.querySelector('#product-filters');
    this.searchInput = this.root.querySelector('#product-search');
    this.sortSelect = this.root.querySelector('#product-sort');
    this.inStockCheckbox = this.root.querySelector('#filter-in-stock');
    this.compatibleCheckbox = this.root.querySelector('#filter-compatible');

    // Get templates
    this.productCardTemplate = document.querySelector('#product-card-template');
    this.filterGroupTemplate = document.querySelector('#filter-group-template');
    this.filterOptionTemplate = document.querySelector('#filter-option-template');

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

    // Compatible filter
    this.compatibleCheckbox.addEventListener('change', (e) => {
      this.handleCompatibleFilter(e.target.checked);
    });

    // Specification filters (delegated event)
    this.filtersEl.addEventListener('change', (e) => {
      if (e.target.classList.contains('filter-option__checkbox')) {
        this.handleSpecFilterChange();
      }
    });

    // Show more buttons (delegated event)
    this.filtersEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-group__show-more')) {
        this.handleShowMoreFilters(e.target);
      }
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
    this.compatibleCheckbox.checked = true;
    this.activeFilters = {};
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
      let products = await konimboAPI.getProductsByCategory(categoryId);

      // Parse specifications for each product
      products = products.map(product => {
        const productWithSpecs = { ...product };
        productWithSpecs.specifications = specParser.parseByCategory(product, categoryId);
        return productWithSpecs;
      });

      // Store all products
      this.allProducts = products;

      stateManager.setCurrentCategoryProducts(products);

      // Build filter UI
      this.buildFilters(products, categoryId);
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
    let products = this.allProducts || state.currentCategoryProducts || [];

    // Apply compatibility filter (if enabled)
    if (this.compatibleCheckbox.checked && state.currentCategory) {
      products = this.filterByCompatibility(products, state.currentCategory.id);
    }

    // Apply specification filters
    products = this.applySpecFilters(products);

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
   * Handle compatible filter
   * @param {boolean} checked
   */
  handleCompatibleFilter(checked) {
    log.debug('ProductModal: Compatible filter', checked);
    this.renderProducts();
  }

  /**
   * Handle specification filter change
   */
  handleSpecFilterChange() {
    log.debug('ProductModal: Spec filter changed');

    // Collect all checked filters
    this.activeFilters = {};

    const filterGroups = this.filtersEl.querySelectorAll('.filter-group');
    filterGroups.forEach(group => {
      const filterKey = group.dataset.filterKey;
      const checkedBoxes = group.querySelectorAll('.filter-option__checkbox:checked');

      if (checkedBoxes.length > 0) {
        this.activeFilters[filterKey] = Array.from(checkedBoxes).map(cb => cb.dataset.filterValue);
      }
    });

    this.renderProducts();
  }

  /**
   * Handle show more filters button
   * @param {HTMLElement} button
   */
  handleShowMoreFilters(button) {
    const filterGroup = button.closest('.filter-group');
    const options = filterGroup.querySelectorAll('.filter-option');

    options.forEach(option => {
      option.style.display = 'flex';
    });

    button.style.display = 'none';
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
   * Filter products by compatibility with current configuration
   * @param {Array} products
   * @param {number} categoryId
   * @returns {Array}
   */
  filterByCompatibility(products, categoryId) {
    const state = stateManager.getState();
    const configuration = state.currentConfiguration;
    const categories = state.categories;

    // If no products selected yet, show all
    if (configuration.selectedProducts.length === 0) {
      return products;
    }

    return products.filter(product => {
      return compatibilityChecker.isProductCompatible(product, categoryId, configuration, categories);
    });
  }

  /**
   * Apply specification filters
   * @param {Array} products
   * @returns {Array}
   */
  applySpecFilters(products) {
    // If no active filters, return all products
    if (Object.keys(this.activeFilters).length === 0) {
      return products;
    }

    return products.filter(product => {
      // Product must match ALL active filter groups (AND logic)
      return Object.entries(this.activeFilters).every(([filterKey, selectedValues]) => {
        // Within a filter group, product must match ANY selected value (OR logic)
        return selectedValues.some(value => {
          return this.productMatchesFilter(product, filterKey, value);
        });
      });
    });
  }

  /**
   * Check if product matches a specific filter
   * @param {Object} product
   * @param {string} filterKey
   * @param {string} filterValue
   * @returns {boolean}
   */
  productMatchesFilter(product, filterKey, filterValue) {
    // Check manufacturer
    if (filterKey === 'manufacturer') {
      return product.manufacturer === filterValue ||
             (product.name && product.name.toLowerCase().includes(filterValue.toLowerCase()));
    }

    // Check specifications
    if (product.specifications && product.specifications[filterKey]) {
      const specValue = product.specifications[filterKey];

      // Handle array specifications
      if (Array.isArray(specValue)) {
        return specValue.includes(filterValue);
      }

      // Handle string/number specifications
      return String(specValue) === String(filterValue);
    }

    return false;
  }

  /**
   * Build filter UI from products
   * @param {Array} products
   * @param {number} categoryId
   */
  buildFilters(products, categoryId) {
    DOM.empty(this.filtersEl);

    // Extract available filter values
    const filterData = this.extractFilterData(products, categoryId);

    // Build filter groups
    Object.entries(filterData).forEach(([filterKey, values]) => {
      if (values.length > 0) {
        const filterGroupEl = this.createFilterGroup(filterKey, values);
        this.filtersEl.appendChild(filterGroupEl);
      }
    });
  }

  /**
   * Extract filter data from products
   * @param {Array} products
   * @param {number} categoryId
   * @returns {Object}
   */
  extractFilterData(products, categoryId) {
    const filterData = {};

    // Extract manufacturers
    const manufacturers = new Set();
    products.forEach(product => {
      if (product.manufacturer) {
        manufacturers.add(product.manufacturer);
      }
    });
    if (manufacturers.size > 0) {
      filterData.manufacturer = Array.from(manufacturers).sort();
    }

    // Extract specification-based filters based on category
    const specFilters = this.getSpecFiltersForCategory(categoryId);

    specFilters.forEach(specKey => {
      const values = new Set();

      products.forEach(product => {
        if (product.specifications && product.specifications[specKey]) {
          const specValue = product.specifications[specKey];

          if (Array.isArray(specValue)) {
            specValue.forEach(v => values.add(String(v)));
          } else {
            values.add(String(specValue));
          }
        }
      });

      if (values.size > 0) {
        filterData[specKey] = Array.from(values).sort();
      }
    });

    return filterData;
  }

  /**
   * Get specification filters for category
   * @param {number} categoryId
   * @returns {Array}
   */
  getSpecFiltersForCategory(categoryId) {
    // Define which specifications to show as filters for each category
    const categoryFilters = {
      32: ['socket', 'tdp'], // Intel CPUs
      33: ['socket', 'tdp'], // AMD CPUs
      17: ['socket', 'formFactor', 'memoryType', 'maxMemorySpeed'], // Motherboards
      169: ['memoryType', 'memorySpeed'], // RAM
      64: ['wattage'], // PSU
      34: ['supportedSockets', 'height'], // Air Cooling
      40: ['supportedSockets'], // Liquid Cooling
      82: ['tdp', 'length'], // GPU
      95: ['supportedFormFactors', 'maxGPULength'], // Case
      172: ['interface', 'pcieGen'] // SSD
    };

    return categoryFilters[categoryId] || [];
  }

  /**
   * Create filter group element
   * @param {string} filterKey
   * @param {Array} values
   * @returns {HTMLElement}
   */
  createFilterGroup(filterKey, values) {
    const clone = this.filterGroupTemplate.content.cloneNode(true);
    const groupEl = clone.querySelector('.filter-group');

    // Set filter key
    groupEl.dataset.filterKey = filterKey;

    // Set title
    const titleEl = groupEl.querySelector('.filter-group__title');
    titleEl.textContent = this.getFilterTitle(filterKey);

    // Add filter options
    const optionsEl = groupEl.querySelector('.filter-group__options');
    const showMoreBtn = groupEl.querySelector('.filter-group__show-more');

    values.forEach((value, index) => {
      const optionEl = this.createFilterOption(filterKey, value);

      // Hide options after the 5th
      if (index >= 5) {
        optionEl.style.display = 'none';
      }

      optionsEl.appendChild(optionEl);
    });

    // Show "Show more" button if more than 5 options
    if (values.length > 5) {
      showMoreBtn.style.display = 'block';
    }

    return groupEl;
  }

  /**
   * Create filter option element
   * @param {string} filterKey
   * @param {string} value
   * @returns {HTMLElement}
   */
  createFilterOption(filterKey, value) {
    const clone = this.filterOptionTemplate.content.cloneNode(true);
    const optionEl = clone.querySelector('.filter-option');

    const checkbox = optionEl.querySelector('.filter-option__checkbox');
    checkbox.dataset.filterValue = value;

    const label = optionEl.querySelector('.filter-option__label');
    label.textContent = this.getFilterValueLabel(filterKey, value);

    return optionEl;
  }

  /**
   * Get filter title (Hebrew)
   * @param {string} filterKey
   * @returns {string}
   */
  getFilterTitle(filterKey) {
    const titles = {
      manufacturer: 'יצרן',
      socket: 'Socket',
      memoryType: 'סוג זיכרון',
      memorySpeed: 'תדר זיכרון (MHz)',
      maxMemorySpeed: 'תדר זיכרון מקסימלי (MHz)',
      formFactor: 'גודל לוח',
      wattage: 'הספק (W)',
      tdp: 'TDP (W)',
      supportedSockets: 'Socket נתמכים',
      supportedFormFactors: 'גדלי לוח נתמכים',
      height: 'גובה (mm)',
      length: 'אורך (mm)',
      maxGPULength: 'אורך כרטיס מסך מקסימלי (mm)',
      maxCoolerHeight: 'גובה מקרר מקסימלי (mm)',
      interface: 'ממשק',
      pcieGen: 'דור PCIe'
    };

    return titles[filterKey] || filterKey;
  }

  /**
   * Get filter value label
   * @param {string} filterKey
   * @param {string} value
   * @returns {string}
   */
  getFilterValueLabel(filterKey, value) {
    // For most filters, just return the value
    // Could add custom formatting here if needed
    return value;
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
