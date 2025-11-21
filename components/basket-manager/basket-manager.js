/**
 * Basket Manager Component
 * @file basket-manager.js
 * @description Manages configuration basket, displays summary and handles cart actions
 */

import stateManager from '../shared/state-manager.js';
import { konimboAPI } from '../../integration/konimbo-api.js';
import configManager from '../shared/config-manager.js';
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
    this.printConfigBtn = this.root.querySelector('#print-config-btn');
    this.loadConfigBtn = this.root.querySelector('#load-config-btn');

    // Config code elements
    this.configCodeSection = this.root.querySelector('#basket-config-code');
    this.configCodeValue = this.root.querySelector('#config-code-value');
    this.copyCodeBtn = this.root.querySelector('#copy-code-btn');

    // Summary elements
    this.subtotalEl = this.root.querySelector('#summary-subtotal');
    this.discountEl = this.root.querySelector('#summary-discount');
    this.discountRowEl = this.root.querySelector('#summary-discount-row');
    this.totalEl = this.root.querySelector('#summary-total');
    this.countEl = this.root.querySelector('#summary-count');

    // Load modal elements
    this.loadModal = document.querySelector('#load-config-modal');
    this.configCodeInput = document.querySelector('#config-code-input');
    this.loadByCodeBtn = document.querySelector('#load-by-code-btn');
    this.recentConfigsList = document.querySelector('#recent-configs-list');

    // Get templates
    this.productItemTemplate = document.querySelector('#basket-product-item-template');
    this.validationMessageTemplate = document.querySelector('#validation-message-template');
    this.recentConfigItemTemplate = document.querySelector('#recent-config-item-template');

    // Configuration state
    this.currentConfigCode = null;
    this.replacementModal = null;
    this.printView = null;

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

    // Print configuration
    this.printConfigBtn.addEventListener('click', () => {
      this.handlePrintConfiguration();
    });

    // Load configuration
    this.loadConfigBtn.addEventListener('click', () => {
      this.handleLoadConfiguration();
    });

    // Copy configuration code
    this.copyCodeBtn.addEventListener('click', () => {
      this.handleCopyCode();
    });

    // Load modal close buttons
    const loadModalCloseButtons = document.querySelectorAll('[data-action="close-load-modal"]');
    loadModalCloseButtons.forEach(btn => {
      btn.addEventListener('click', () => this.closeLoadModal());
    });

    // Load by code button
    this.loadByCodeBtn.addEventListener('click', () => {
      this.handleLoadByCode();
    });

    // Load recent config (delegated event)
    this.recentConfigsList.addEventListener('click', (e) => {
      const loadBtn = e.target.closest('[data-action="load-recent-config"]');
      if (loadBtn) {
        const configItem = loadBtn.closest('.recent-config-item');
        const code = configItem.dataset.configCode;
        this.handleLoadByCode(code);
      }
    });

    // Enter key in config code input
    this.configCodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleLoadByCode();
      }
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
      this.hideConfigCode();
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

    // Show compatibility errors
    if (validation.compatibilityIssues && validation.compatibilityIssues.length > 0) {
      validation.compatibilityIssues.forEach(issue => {
        const message = typeof issue === 'string' ? issue : issue.message;
        const severity = typeof issue === 'object' ? issue.severity : 'error';
        const messageEl = this.createValidationMessage(message, severity);
        this.validationEl.appendChild(messageEl);
      });
    }

    // Show warnings (both category-based and compatibility)
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach(warning => {
        const message = typeof warning === 'string' ? warning : warning.message;
        const severity = typeof warning === 'object' ? warning.severity : 'warning';
        const messageEl = this.createValidationMessage(message, severity);
        this.validationEl.appendChild(messageEl);
      });
    }

    // Show info messages
    if (validation.info && validation.info.length > 0) {
      validation.info.forEach(info => {
        const message = typeof info === 'string' ? info : info.message;
        const severity = typeof info === 'object' ? info.severity : 'info';
        const messageEl = this.createValidationMessage(message, severity);
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

    const state = stateManager.getState();
    const config = state.currentConfiguration;

    if (config.selectedProducts.length === 0) {
      alert('אין מה לשמור. הסל ריק.');
      return;
    }

    const customerName = prompt('הכנס שם (אופציונלי):') || '';

    try {
      const code = configManager.saveConfiguration(config, customerName);
      this.currentConfigCode = code;

      // Update UI with configuration code
      this.showConfigCode(code);

      alert(`התצורה נשמרה בהצלחה!\n\nקוד התצורה: ${code}\n\nשמור קוד זה לטעינה מאוחרת יותר.`);
    } catch (error) {
      log.error('BasketManager: Error saving configuration', error);
      alert('שגיאה בשמירת התצורה. אנא נסה שוב.');
    }
  }

  /**
   * Handle print configuration
   */
  handlePrintConfiguration() {
    log.debug('BasketManager: Printing configuration');

    if (!this.currentConfigCode) {
      // Save first if not saved
      this.handleSaveConfiguration();

      if (!this.currentConfigCode) {
        return; // User cancelled
      }
    }

    // Lazy load print view component
    if (!this.printView) {
      import('../print-view/print-view.js').then(module => {
        const PrintView = module.default;
        this.printView = new PrintView('#print-view');
        this.printView.printConfiguration(this.currentConfigCode);
      }).catch(error => {
        log.error('BasketManager: Error loading print view', error);
        alert('שגיאה בטעינת תצוגת ההדפסה');
      });
    } else {
      this.printView.printConfiguration(this.currentConfigCode);
    }
  }

  /**
   * Handle load configuration
   */
  handleLoadConfiguration() {
    log.debug('BasketManager: Opening load configuration modal');

    // Load recent configurations
    this.loadRecentConfigurations();

    // Show modal
    DOM.show(this.loadModal);
    document.body.style.overflow = 'hidden';

    // Focus on input
    this.configCodeInput.value = '';
    this.configCodeInput.focus();
  }

  /**
   * Handle load by code
   * @param {string} code - Optional code (from recent list or input)
   */
  async handleLoadByCode(code) {
    const configCode = code || this.configCodeInput.value.trim().toUpperCase();

    if (!configCode) {
      alert('אנא הזן קוד תצורה');
      return;
    }

    log.debug('BasketManager: Loading configuration by code', configCode);

    // Load configuration data
    const configData = configManager.loadByCode(configCode);

    if (!configData) {
      alert(`לא נמצאה תצורה עם הקוד: ${configCode}`);
      return;
    }

    // Close load modal
    this.closeLoadModal();

    // Check if current configuration will be overwritten
    const state = stateManager.getState();
    if (state.currentConfiguration.selectedProducts.length > 0) {
      if (!confirm('טעינת תצורה זו תמחק את התצורה הנוכחית. להמשיך?')) {
        return;
      }
    }

    // Check stock status for all products
    const stockStatus = await configManager.checkStockStatus(
      configData.configuration,
      async (productId) => {
        try {
          const product = await konimboAPI.getProductById(productId);
          return product && product.inStock;
        } catch (error) {
          log.warn('BasketManager: Error checking stock for product', productId, error);
          return false;
        }
      }
    );

    // If all items in stock, load directly
    if (stockStatus.outOfStock.length === 0) {
      this.loadConfigurationData(configData);
      alert(`התצורה "${configCode}" נטענה בהצלחה!`);
      return;
    }

    // Handle out-of-stock items with replacement modal
    alert(`${stockStatus.outOfStock.length} מוצרים אינם זמינים במלאי.\nתוצג אפשרות לבחור מוצרים חלופיים.`);

    this.handleOutOfStockItems(configData, stockStatus);
  }

  /**
   * Handle out-of-stock items with replacement modal
   * @param {Object} configData
   * @param {Object} stockStatus
   */
  async handleOutOfStockItems(configData, stockStatus) {
    // Lazy load replacement modal
    if (!this.replacementModal) {
      const module = await import('../replacement-modal/replacement-modal.js');
      const ReplacementModal = module.default;
      this.replacementModal = new ReplacementModal('#replacement-modal');
    }

    // Clear current configuration
    stateManager.clearConfiguration();

    // Add in-stock items first
    stockStatus.inStock.forEach(item => {
      stateManager.addProduct(item.product, item.categoryId, item.quantity);
    });

    // Process out-of-stock items one by one
    let currentIndex = 0;
    const processNextOutOfStockItem = async () => {
      if (currentIndex >= stockStatus.outOfStock.length) {
        // All done
        this.currentConfigCode = configData.code;
        this.showConfigCode(configData.code);
        alert('טעינת התצורה הושלמה!');
        return;
      }

      const item = stockStatus.outOfStock[currentIndex];
      const state = stateManager.getState();
      const configuration = state.currentConfiguration;

      // Open replacement modal
      this.replacementModal.open(
        item.product,
        item.categoryId,
        configuration,
        // On select replacement
        (replacement) => {
          stateManager.addProduct(replacement, item.categoryId, item.quantity);
          currentIndex++;
          processNextOutOfStockItem();
        },
        // On skip
        () => {
          // Skip this product
          currentIndex++;
          processNextOutOfStockItem();
        },
        // On cancel
        () => {
          // Cancel entire load
          stateManager.clearConfiguration();
          alert('טעינת התצורה בוטלה');
        }
      );
    };

    processNextOutOfStockItem();
  }

  /**
   * Load configuration data into state
   * @param {Object} configData
   */
  loadConfigurationData(configData) {
    // Clear current configuration
    stateManager.clearConfiguration();

    // Add all products
    configData.configuration.selectedProducts.forEach(item => {
      stateManager.addProduct(item.product, item.categoryId, item.quantity);
    });

    // Set configuration code
    this.currentConfigCode = configData.code;
    this.showConfigCode(configData.code);
  }

  /**
   * Handle copy configuration code
   */
  handleCopyCode() {
    if (!this.currentConfigCode) {
      return;
    }

    // Copy to clipboard
    navigator.clipboard.writeText(this.currentConfigCode).then(() => {
      // Show success feedback
      const originalText = this.copyCodeBtn.querySelector('span').textContent;
      this.copyCodeBtn.querySelector('span').textContent = '✓';

      setTimeout(() => {
        this.copyCodeBtn.querySelector('span').textContent = originalText;
      }, 2000);
    }).catch(error => {
      log.error('BasketManager: Error copying code', error);
      alert('שגיאה בהעתקת הקוד');
    });
  }

  /**
   * Show configuration code in UI
   * @param {string} code
   */
  showConfigCode(code) {
    this.configCodeValue.textContent = code;
    DOM.show(this.configCodeSection);
  }

  /**
   * Hide configuration code
   */
  hideConfigCode() {
    this.configCodeValue.textContent = '--';
    DOM.hide(this.configCodeSection);
    this.currentConfigCode = null;
  }

  /**
   * Load recent configurations into modal
   */
  loadRecentConfigurations() {
    const recentConfigs = configManager.getRecentConfigurations(5);

    // Clear existing
    DOM.empty(this.recentConfigsList);

    if (recentConfigs.length === 0) {
      this.recentConfigsList.innerHTML = '<p class="recent-configs-empty">אין תצורות שמורות</p>';
      return;
    }

    // Add recent configs
    recentConfigs.forEach(configData => {
      const itemEl = this.createRecentConfigItem(configData);
      this.recentConfigsList.appendChild(itemEl);
    });
  }

  /**
   * Create recent config item element
   * @param {Object} configData
   * @returns {HTMLElement}
   */
  createRecentConfigItem(configData) {
    const clone = this.recentConfigItemTemplate.content.cloneNode(true);
    const itemEl = clone.querySelector('.recent-config-item');

    itemEl.dataset.configCode = configData.code;

    const codeEl = itemEl.querySelector('.recent-config-item__code');
    codeEl.textContent = configData.code;

    const dateEl = itemEl.querySelector('.recent-config-item__date');
    const date = new Date(configData.updatedAt);
    dateEl.textContent = date.toLocaleDateString('he-IL');

    const countEl = itemEl.querySelector('.recent-config-item__count');
    countEl.textContent = `${configData.itemCount} רכיבים`;

    const priceEl = itemEl.querySelector('.recent-config-item__price');
    priceEl.textContent = Num.formatPrice(configData.totalPrice);

    return itemEl;
  }

  /**
   * Close load configuration modal
   */
  closeLoadModal() {
    DOM.hide(this.loadModal);
    document.body.style.overflow = '';
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
    if (this.replacementModal) {
      this.replacementModal.destroy();
    }
    if (this.printView) {
      this.printView.destroy();
    }
    log.debug('BasketManager: Destroyed');
  }
}

export default BasketManager;
