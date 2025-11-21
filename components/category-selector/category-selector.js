/**
 * Category Selector Component
 * @file category-selector.js
 * @description Displays product categories and handles category selection
 */

import stateManager from '../shared/state-manager.js';
import { EVENTS, CSS_CLASSES } from '../shared/constants.js';
import { DOM, Num, log } from '../shared/utils.js';

class CategorySelector {
  constructor(rootElement) {
    this.root = typeof rootElement === 'string'
      ? document.querySelector(rootElement)
      : rootElement;

    if (!this.root) {
      throw new Error('CategorySelector: Root element not found');
    }

    this.categoryListEl = null;
    this.categoryItemTemplate = null;
    this.selectedProductBadgeTemplate = null;

    this.init();
  }

  /**
   * Initialize component
   */
  init() {
    log.debug('CategorySelector: Initializing');

    // Get elements
    this.categoryListEl = this.root.querySelector('#category-list');
    this.categoryEmptyEl = this.root.querySelector('#category-empty');
    this.categoryLoadingEl = this.root.querySelector('#category-loading');

    // Get templates
    this.categoryItemTemplate = document.querySelector('#category-item-template');
    this.selectedProductBadgeTemplate = document.querySelector('#selected-product-badge-template');

    // Subscribe to state changes
    this.unsubscribe = stateManager.subscribe(this.handleStateChange.bind(this));

    // Add event listeners
    this.attachEventListeners();

    // Initial render
    this.render();

    log.debug('CategorySelector: Initialized');
  }

  /**
   * Handle state changes
   * @param {Object} state
   * @param {Object} prevState
   */
  handleStateChange(state, prevState) {
    // Re-render if categories changed
    if (state.categories !== prevState.categories) {
      this.render();
    }

    // Update selected products if configuration changed
    if (state.currentConfiguration !== prevState.currentConfiguration) {
      this.updateSelectedProducts();
    }

    // Update loading state
    if (state.loading.categories !== prevState.loading.categories) {
      this.toggleLoading(state.loading.categories);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Delegate click events
    this.categoryListEl.addEventListener('click', (e) => {
      const selectBtn = e.target.closest('[data-action="select-category"]');
      if (selectBtn) {
        const categoryItem = selectBtn.closest('.category-item');
        const categoryId = parseInt(categoryItem.dataset.categoryId);
        this.handleCategorySelect(categoryId);
      }

      const removeBtn = e.target.closest('[data-action="remove-product"]');
      if (removeBtn) {
        const badge = removeBtn.closest('.selected-product-badge');
        const productIndex = parseInt(badge.dataset.productIndex);
        this.handleProductRemove(productIndex);
      }
    });
  }

  /**
   * Handle category selection
   * @param {number} categoryId
   */
  handleCategorySelect(categoryId) {
    log.debug('CategorySelector: Category selected', categoryId);

    const state = stateManager.getState();
    const category = state.categories.find(c => c.id === categoryId);

    if (category) {
      stateManager.setCurrentCategory(category);
    }
  }

  /**
   * Handle product removal
   * @param {number} productIndex
   */
  handleProductRemove(productIndex) {
    log.debug('CategorySelector: Removing product', productIndex);
    stateManager.removeProduct(productIndex);
  }

  /**
   * Render categories
   */
  render() {
    const state = stateManager.getState();
    const categories = state.categories;

    // Clear list
    DOM.empty(this.categoryListEl);

    if (!categories || categories.length === 0) {
      DOM.show(this.categoryEmptyEl);
      return;
    }

    DOM.hide(this.categoryEmptyEl);

    // Sort categories by order
    const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

    // Render each category
    sortedCategories.forEach(category => {
      if (category.enabled !== false) {
        const categoryEl = this.createCategoryElement(category);
        this.categoryListEl.appendChild(categoryEl);
      }
    });

    // Update selected products
    this.updateSelectedProducts();
  }

  /**
   * Create category element
   * @param {Object} category
   * @returns {HTMLElement}
   */
  createCategoryElement(category) {
    // Clone template
    const clone = this.categoryItemTemplate.content.cloneNode(true);
    const categoryEl = clone.querySelector('.category-item');

    // Set category data
    categoryEl.dataset.categoryId = category.id;

    // Set icon
    const iconEl = categoryEl.querySelector('.category-item__icon');
    iconEl.textContent = category.icon || '📦';

    // Set name
    const nameEl = categoryEl.querySelector('.category-item__name');
    nameEl.textContent = category.displayName || category.nameHebrew || category.name;

    // Show required badge
    if (category.required) {
      const badgeEl = categoryEl.querySelector('.category-item__badge--required');
      DOM.show(badgeEl);
    }

    return categoryEl;
  }

  /**
   * Update selected products display
   */
  updateSelectedProducts() {
    const state = stateManager.getState();
    const selectedProducts = state.currentConfiguration.selectedProducts;

    // Update each category
    const categoryItems = this.categoryListEl.querySelectorAll('.category-item');

    categoryItems.forEach(categoryEl => {
      const categoryId = parseInt(categoryEl.dataset.categoryId);

      // Find products for this category
      const categoryProducts = selectedProducts
        .map((item, index) => ({ ...item, index }))
        .filter(item => item.categoryId === categoryId);

      const selectedContainer = categoryEl.querySelector('.category-item__selected');
      const productsContainer = categoryEl.querySelector('[data-selected-products]');

      if (categoryProducts.length > 0) {
        // Show selected products
        DOM.show(selectedContainer);
        DOM.empty(productsContainer);

        categoryProducts.forEach(item => {
          const badge = this.createProductBadge(item);
          productsContainer.appendChild(badge);
        });

        // Update button text
        const selectBtn = categoryEl.querySelector('[data-action="select-category"]');
        const btnText = selectBtn.querySelector('.btn__text');
        btnText.textContent = 'שנה בחירה';

      } else {
        // Hide selected products
        DOM.hide(selectedContainer);

        // Reset button text
        const selectBtn = categoryEl.querySelector('[data-action="select-category"]');
        const btnText = selectBtn.querySelector('.btn__text');
        btnText.textContent = 'בחר רכיב';
      }
    });
  }

  /**
   * Create product badge element
   * @param {Object} item - Selected product item with index
   * @returns {HTMLElement}
   */
  createProductBadge(item) {
    const clone = this.selectedProductBadgeTemplate.content.cloneNode(true);
    const badgeEl = clone.querySelector('.selected-product-badge');

    // Set product data
    badgeEl.dataset.productId = item.product.id;
    badgeEl.dataset.productIndex = item.index;

    // Set image
    const imgEl = badgeEl.querySelector('img');
    if (item.product.primaryImage) {
      imgEl.src = item.product.primaryImage;
      imgEl.alt = item.product.name;
    } else {
      imgEl.style.display = 'none';
    }

    // Set name
    const nameEl = badgeEl.querySelector('.selected-product-badge__name');
    nameEl.textContent = item.product.name;

    // Set price
    const priceEl = badgeEl.querySelector('.selected-product-badge__price');
    priceEl.textContent = Num.formatPrice(item.product.price);

    return badgeEl;
  }

  /**
   * Toggle loading state
   * @param {boolean} loading
   */
  toggleLoading(loading) {
    if (loading) {
      DOM.show(this.categoryLoadingEl);
      DOM.hide(this.categoryListEl);
    } else {
      DOM.hide(this.categoryLoadingEl);
      DOM.show(this.categoryListEl);
    }
  }

  /**
   * Destroy component
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    log.debug('CategorySelector: Destroyed');
  }
}

export default CategorySelector;
