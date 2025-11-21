/**
 * Basket Manager Component
 * @file basket-manager.js
 * @description Manages configuration basket, displays summary and handles cart actions
 */

import stateManager from '../shared/state-manager.js';
import { konimboAPI } from '../../integration/konimbo-api.js';
import { EVENTS } from '../shared/constants.js';
import { DOM, Num, log } from '../shared/utils.js';

class BasketManager {
  constructor(rootElement) {
    this.root = typeof rootElement === 'string'
      ? document.querySelector(rootElement)
      : rootElement;

    if (!this.root) {
      throw new Error('BasketManager: Root element not found');
    }

    this.productsEl = null;
    this.summaryEl = null;
    this.validationEl = null;
    this.productItemTemplate = null;
    this.validationMessageTemplate = null;

    this.init();
  }

  /**
   * Initialize component
   */
  init() {
    log.debug('BasketManager: Initializing');

    // Get elements
    this.productsEl = this.root.querySelector('#basket-products');
    this.basketEmptyEl = this.root.querySelector('#basket-empty');
    this.summaryEl = this.root.querySelector('#basket-summary');
    this.validationEl = this.root.querySelector('#basket-validation');
    this.addToCartBtn = this.root.querySelector('#add-to-cart-btn');
    this.clearConfigBtn = this.root.querySelector('#clear-config-btn');
    this.saveConfigBtn = this.root.querySelector('#save-config-btn');

    // Summary elements
    this.subtotalEl = this.root.querySelector('#summary-subtotal');
    this.discountEl = this.root.querySelector('#summary-discount');
    this.discountRowEl = this.root.querySelector('#summary-discount-row');
    this.totalEl = this.root.querySelector('#summary-total');
    this.countEl = this.root.querySelector('#summary-count');

    // Get templates
    this.productItemTemplate = document.querySelector('#basket-product-item-template');
    this.validationMessageTemplate = document.querySelector('#validation-message-template');

    // Subscribe to state changes
    this.unsubscribe = stateManager.subscribe(this.handleStateChange.bind(this));

    // Add event listeners
    this.attachEventListeners();

    // Initial render
    this.render();

    log.debug('BasketManager: Initialized');
  }

  /**
   * Handle state changes
   * @param {Object} state
   * @param {Object} prevState
   */
  handleStateChange(state, prevState) {
    // Re-render if configuration changed
    if (state.currentConfiguration !== prevState.currentConfiguration) {
      this.render();
    }

    // Update loading state
    if (state.loading.addingToCart !== prevState.loading.addingToCart) {
      this.toggleAddingToCart(state.loading.addingToCart);
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Remove product
    this.productsEl.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-action="remove-item"]');
      if (removeBtn) {
        const item = removeBtn.closest('.basket-product-item');
        const productIndex = parseInt(item.dataset.productIndex);
        this.handleRemoveProduct(productIndex);
      }
    });

    // Add to cart
    this.addToCartBtn.addEventListener('click', () => {
      this.handleAddToCart();
    });

    // Clear configuration
    this.clearConfigBtn.addEventListener('click', () => {
      this.handleClearConfiguration();
    });

    // Save configuration
    this.saveConfigBtn.addEventListener('click', () => {
      this.handleSaveConfiguration();
    });
  }

  /**
   * Render basket
   */
  render() {
    const state = stateManager.getState();
    const config = state.currentConfiguration;
    const selectedProducts = config.selectedProducts;

    // Clear products list (except empty message)
    const items = this.productsEl.querySelectorAll('.basket-product-item');
    items.forEach(item => item.remove());

    if (selectedProducts.length === 0) {
      DOM.show(this.basketEmptyEl);
      DOM.hide(this.summaryEl);
      this.addToCartBtn.disabled = true;
      this.clearConfigBtn.disabled = true;
      DOM.empty(this.validationEl);
      return;
    }

    DOM.hide(this.basketEmptyEl);
    DOM.show(this.summaryEl);
    this.clearConfigBtn.disabled = false;

    // Render products
    selectedProducts.forEach((item, index) => {
      const productEl = this.createProductItem(item, index);
      this.productsEl.appendChild(productEl);
    });

    // Update summary
    this.updateSummary(config);

    // Update validation
    this.updateValidation(config.validation);

    // Update add to cart button state
    this.addToCartBtn.disabled = !config.isValid;
  }

  /**
   * Create product item element
   * @param {Object} item
   * @param {number} index
   * @returns {HTMLElement}
   */
  createProductItem(item, index) {
    const clone = this.productItemTemplate.content.cloneNode(true);
    const itemEl = clone.querySelector('.basket-product-item');

    // Set index
    itemEl.dataset.productIndex = index;

    // Find category name
    const state = stateManager.getState();
    const category = state.categories.find(c => c.id === item.categoryId);
    const categoryName = category ? category.displayName : 'לא ידוע';

    // Set category
    const categoryEl = itemEl.querySelector('.basket-product-item__category');
    categoryEl.textContent = categoryName;

    // Set name
    const nameEl = itemEl.querySelector('.basket-product-item__name');
    nameEl.textContent = item.product.name;

    // Set SKU
    const skuEl = itemEl.querySelector('.basket-product-item__sku');
    skuEl.textContent = `קוד: ${item.product.sku}`;

    // Set price
    const priceEl = itemEl.querySelector('.basket-product-item__price');
    priceEl.textContent = Num.formatPrice(item.lineTotal);

    return itemEl;
  }

  /**
   * Update summary
   * @param {Object} config
   */
  updateSummary(config) {
    // Update subtotal
    this.subtotalEl.textContent = Num.formatPrice(config.subtotal || config.totalPrice);

    // Update discount
    if (config.totalDiscount > 0) {
      this.discountEl.textContent = `-${Num.formatPrice(config.totalDiscount)}`;
      DOM.show(this.discountRowEl);
    } else {
      DOM.hide(this.discountRowEl);
    }

    // Update total
    this.totalEl.textContent = Num.formatPrice(config.totalPrice);

    // Update count
    this.countEl.textContent = config.selectedProducts.length;
  }

  /**
   * Update validation messages
   * @param {Object} validation
   */
  updateValidation(validation) {
    DOM.empty(this.validationEl);

    if (!validation) return;

    const state = stateManager.getState();

    // Show missing required categories
    if (validation.missingRequired && validation.missingRequired.length > 0) {
      validation.missingRequired.forEach(categoryId => {
        const category = state.categories.find(c => c.id === categoryId);
        if (category) {
          const message = `חסר: ${category.displayName}`;
          const messageEl = this.createValidationMessage(message, 'error');
          this.validationEl.appendChild(messageEl);
        }
      });
    }

    // Show compatibility issues
    if (validation.compatibilityIssues && validation.compatibilityIssues.length > 0) {
      validation.compatibilityIssues.forEach(issue => {
        const messageEl = this.createValidationMessage(issue.message, 'error');
        this.validationEl.appendChild(messageEl);
      });
    }

    // Show warnings
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        const messageEl = this.createValidationMessage(warning, 'warning');
        this.validationEl.appendChild(messageEl);
      });
    }
  }

  /**
   * Create validation message element
   * @param {string} message
   * @param {string} type
   * @returns {HTMLElement}
   */
  createValidationMessage(message, type = 'error') {
    const clone = this.validationMessageTemplate.content.cloneNode(true);
    const messageEl = clone.querySelector('.validation-message');

    messageEl.classList.add(`validation-message--${type}`);

    const textEl = messageEl.querySelector('.validation-message__text');
    textEl.textContent = message;

    return messageEl;
  }

  /**
   * Handle remove product
   * @param {number} productIndex
   */
  handleRemoveProduct(productIndex) {
    log.debug('BasketManager: Removing product', productIndex);

    if (confirm('האם להסיר רכיב זה מהתצורה?')) {
      stateManager.removeProduct(productIndex);
    }
  }

  /**
   * Handle add to cart
   */
  async handleAddToCart() {
    log.debug('BasketManager: Adding configuration to cart');

    const state = stateManager.getState();
    const config = state.currentConfiguration;

    if (!config.isValid) {
      alert('אנא השלם את כל הרכיבים הנדרשים');
      return;
    }

    if (config.selectedProducts.length === 0) {
      alert('הסל ריק');
      return;
    }

    stateManager.setLoading('addingToCart', true);

    try {
      await konimboAPI.addConfigurationToCart(config);

      // Success - redirect to cart
      alert('התצורה נוספה לסל בהצלחה!');

      // Clear configuration
      stateManager.clearConfiguration();

      // Redirect to cart page
      window.location.href = '/cart';

    } catch (error) {
      log.error('BasketManager: Error adding to cart', error);

      alert('שגיאה בהוספה לסל. אנא נסה שוב.');
      stateManager.setError({
        hasError: true,
        message: 'שגיאה בהוספה לסל',
        code: 'ADD_TO_CART_ERROR'
      });
    } finally {
      stateManager.setLoading('addingToCart', false);
    }
  }

  /**
   * Handle clear configuration
   */
  handleClearConfiguration() {
    log.debug('BasketManager: Clearing configuration');

    if (confirm('האם לנקות את כל התצורה?')) {
      stateManager.clearConfiguration();
    }
  }

  /**
   * Handle save configuration
   */
  handleSaveConfiguration() {
    log.debug('BasketManager: Saving configuration');

    const name = prompt('הכנס שם לתצורה:');

    if (name) {
      stateManager.saveConfiguration(name);
      alert('התצורה נשמרה בהצלחה!');
    }
  }

  /**
   * Toggle adding to cart state
   * @param {boolean} loading
   */
  toggleAddingToCart(loading) {
    if (loading) {
      this.addToCartBtn.disabled = true;
      const btnText = this.addToCartBtn.querySelector('.btn__text');
      btnText.textContent = 'מוסיף לסל...';
    } else {
      const state = stateManager.getState();
      this.addToCartBtn.disabled = !state.currentConfiguration.isValid;
      const btnText = this.addToCartBtn.querySelector('.btn__text');
      btnText.textContent = 'הוסף לסל';
    }
  }

  /**
   * Destroy component
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    log.debug('BasketManager: Destroyed');
  }
}

export default BasketManager;
