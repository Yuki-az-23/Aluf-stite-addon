/**
 * State Manager for PC Configurator
 * @file state-manager.js
 * @description Centralized state management using singleton pattern
 */

import { CONFIG, EVENTS, DEFAULT_CONFIG, CONFIG_STATES, STORAGE_KEYS } from './constants.js';
import { deepClone, generateId, log, Storage } from './utils.js';
import compatibilityChecker from './compatibility-checker.js';
import specParser from './spec-parser.js';

/**
 * StateManager - Singleton class for managing application state
 */
class StateManager {
  constructor() {
    // Ensure singleton
    if (StateManager.instance) {
      return StateManager.instance;
    }

    // Initialize state
    this.state = this.getInitialState();

    // Subscribers for state changes
    this.subscribers = [];

    // Auto-save interval
    this.autoSaveInterval = null;

    // Set instance
    StateManager.instance = this;

    log.debug('StateManager initialized', this.state);
  }

  /**
   * Get initial state
   * @returns {Object}
   */
  getInitialState() {
    // Try to load from localStorage
    const saved = Storage.get(STORAGE_KEYS.CURRENT_CONFIG);

    return {
      // Current configuration
      currentConfiguration: saved || deepClone(DEFAULT_CONFIG),

      // All available categories
      categories: [],

      // Currently opened category (in modal)
      currentCategory: null,

      // Products for current category
      currentCategoryProducts: [],

      // Loading states
      loading: {
        categories: false,
        products: false,
        addingToCart: false
      },

      // UI state
      ui: {
        isModalOpen: false,
        modalType: null, // 'product' | 'saved-configs' | 'share'
        searchQuery: '',
        filters: {
          priceRange: [0, 999999],
          manufacturers: [],
          inStock: false
        },
        sortBy: 'popularity'
      },

      // User preferences
      preferences: Storage.get(STORAGE_KEYS.PREFERENCES) || {
        language: CONFIG.DEFAULT_LANGUAGE,
        currency: CONFIG.DEFAULT_CURRENCY,
        showPricesWithVAT: CONFIG.SHOW_PRICES_WITH_VAT
      },

      // Error state
      error: {
        hasError: false,
        message: '',
        code: ''
      },

      // Saved configurations
      savedConfigurations: Storage.get(STORAGE_KEYS.SAVED_CONFIGS) || []
    };
  }

  /**
   * Get current state (immutable copy)
   * @returns {Object}
   */
  getState() {
    return deepClone(this.state);
  }

  /**
   * Update state
   * @param {Object|Function} updates - Object with updates or function that returns updates
   */
  setState(updates) {
    const prevState = deepClone(this.state);

    // If updates is a function, call it with current state
    const newUpdates = typeof updates === 'function'
      ? updates(this.state)
      : updates;

    // Merge updates
    this.state = this.mergeState(this.state, newUpdates);

    // Update configuration timestamp
    if (newUpdates.currentConfiguration) {
      this.state.currentConfiguration.metadata.updatedAt = new Date();
    }

    // Log state change in debug mode
    log.debug('State updated', {
      prev: prevState,
      updates: newUpdates,
      current: this.state
    });

    // Notify subscribers
    this.notifySubscribers(prevState, this.state);

    // Save to localStorage if auto-save is enabled
    if (CONFIG.AUTO_SAVE) {
      this.saveToStorage();
    }

    // Emit state changed event
    this.emitEvent(EVENTS.STATE_CHANGED, {
      prevState,
      currentState: this.getState()
    });
  }

  /**
   * Merge state updates deeply
   * @param {Object} current
   * @param {Object} updates
   * @returns {Object}
   */
  mergeState(current, updates) {
    const merged = { ...current };

    Object.keys(updates).forEach(key => {
      if (typeof updates[key] === 'object' && !Array.isArray(updates[key]) && updates[key] !== null) {
        merged[key] = {
          ...merged[key],
          ...updates[key]
        };
      } else {
        merged[key] = updates[key];
      }
    });

    return merged;
  }

  /**
   * Subscribe to state changes
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.subscribers.push(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all subscribers
   * @param {Object} prevState
   * @param {Object} currentState
   */
  notifySubscribers(prevState, currentState) {
    this.subscribers.forEach(callback => {
      try {
        callback(currentState, prevState);
      } catch (error) {
        log.error('Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Set categories
   * @param {Array} categories
   */
  setCategories(categories) {
    this.setState({ categories });
    this.emitEvent(EVENTS.CATEGORY_LOADED, { categories });
  }

  /**
   * Set current category
   * @param {Object} category
   */
  setCurrentCategory(category) {
    this.setState({
      currentCategory: category,
      ui: { ...this.state.ui, isModalOpen: true, modalType: 'product' }
    });
    this.emitEvent(EVENTS.CATEGORY_SELECTED, { category });
  }

  /**
   * Set products for current category
   * @param {Array} products
   */
  setCurrentCategoryProducts(products) {
    this.setState({ currentCategoryProducts: products });
    this.emitEvent(EVENTS.PRODUCTS_LOADED, { products });
  }

  /**
   * Add product to configuration
   * @param {Object} product
   * @param {number} categoryId
   * @param {number} quantity
   */
  addProduct(product, categoryId, quantity = 1) {
    const config = this.state.currentConfiguration;
    const category = this.state.categories.find(c => c.id === categoryId);

    // Check if category allows multiple products
    const existingProducts = config.selectedProducts.filter(p => p.categoryId === categoryId);

    // If category doesn't allow multiple, remove existing
    if (existingProducts.length > 0 && (!category || category.maxProducts === 1)) {
      this.removeProductsByCategory(categoryId);
    }

    // Check max products limit
    if (category && existingProducts.length >= category.maxProducts) {
      this.setError({
        hasError: true,
        message: `ניתן לבחור עד ${category.maxProducts} מוצרים בקטגוריה זו`,
        code: 'MAX_PRODUCTS_EXCEEDED'
      });
      return;
    }

    // Parse and enhance product specifications
    const productWithSpecs = deepClone(product);
    productWithSpecs.specifications = specParser.parseByCategory(product, categoryId);

    // Create selected product object
    const selectedProduct = {
      product: productWithSpecs,
      categoryId,
      quantity,
      lineTotal: product.price * quantity,
      addedAt: new Date(),
      notes: '',
      isValid: true,
      validationMessages: []
    };

    // Add to selected products
    const selectedProducts = [...config.selectedProducts, selectedProduct];

    // Recalculate totals
    const { totalPrice, subtotal, totalDiscount } = this.calculateTotals(selectedProducts);

    // Update configuration
    const updatedConfig = {
      ...config,
      selectedProducts,
      totalPrice,
      subtotal,
      totalDiscount,
      metadata: {
        ...config.metadata,
        updatedAt: new Date()
      }
    };

    // Validate configuration
    updatedConfig.validation = this.validateConfiguration(updatedConfig);
    updatedConfig.isValid = this.isConfigurationValid(updatedConfig.validation);

    this.setState({ currentConfiguration: updatedConfig });
    this.emitEvent(EVENTS.PRODUCT_SELECTED, { product, categoryId });
    this.emitEvent(EVENTS.CONFIGURATION_UPDATED, { configuration: updatedConfig });

    log.debug('Product added', { product, categoryId, quantity });
  }

  /**
   * Remove product from configuration
   * @param {number} productIndex
   */
  removeProduct(productIndex) {
    const config = this.state.currentConfiguration;
    const product = config.selectedProducts[productIndex];

    if (!product) return;

    // Remove product
    const selectedProducts = config.selectedProducts.filter((_, index) => index !== productIndex);

    // Recalculate totals
    const { totalPrice, subtotal, totalDiscount } = this.calculateTotals(selectedProducts);

    // Update configuration
    const updatedConfig = {
      ...config,
      selectedProducts,
      totalPrice,
      subtotal,
      totalDiscount
    };

    // Validate configuration
    updatedConfig.validation = this.validateConfiguration(updatedConfig);
    updatedConfig.isValid = this.isConfigurationValid(updatedConfig.validation);

    this.setState({ currentConfiguration: updatedConfig });
    this.emitEvent(EVENTS.PRODUCT_REMOVED, { product: product.product });
    this.emitEvent(EVENTS.CONFIGURATION_UPDATED, { configuration: updatedConfig });

    log.debug('Product removed', { productIndex, product });
  }

  /**
   * Remove all products from a category
   * @param {number} categoryId
   */
  removeProductsByCategory(categoryId) {
    const config = this.state.currentConfiguration;
    const selectedProducts = config.selectedProducts.filter(p => p.categoryId !== categoryId);

    // Recalculate totals
    const { totalPrice, subtotal, totalDiscount } = this.calculateTotals(selectedProducts);

    // Update configuration
    const updatedConfig = {
      ...config,
      selectedProducts,
      totalPrice,
      subtotal,
      totalDiscount
    };

    // Validate configuration
    updatedConfig.validation = this.validateConfiguration(updatedConfig);
    updatedConfig.isValid = this.isConfigurationValid(updatedConfig.validation);

    this.setState({ currentConfiguration: updatedConfig });
  }

  /**
   * Calculate configuration totals
   * @param {Array} selectedProducts
   * @returns {Object}
   */
  calculateTotals(selectedProducts) {
    let subtotal = 0;
    let totalDiscount = 0;

    selectedProducts.forEach(item => {
      const price = item.product.price;
      const originalPrice = item.product.originalPrice || price;
      const discount = (originalPrice - price) * item.quantity;

      subtotal += originalPrice * item.quantity;
      totalDiscount += discount;
    });

    const totalPrice = subtotal - totalDiscount;

    return { totalPrice, subtotal, totalDiscount };
  }

  /**
   * Validate configuration
   * @param {Object} config
   * @returns {Object}
   */
  validateConfiguration(config) {
    const validation = {
      missingRequired: [],
      compatibilityIssues: [],
      warnings: [],
      info: []
    };

    // Check required categories
    this.state.categories.forEach(category => {
      if (category.required) {
        const hasProduct = config.selectedProducts.some(p => p.categoryId === category.id);
        if (!hasProduct) {
          validation.missingRequired.push(category.id);
        }
      }
    });

    // Check mutually exclusive categories
    this.state.categories.forEach(category => {
      if (category.mutuallyExclusive && category.mutuallyExclusive.length > 0) {
        const hasCurrentCategory = config.selectedProducts.some(p => p.categoryId === category.id);
        if (hasCurrentCategory) {
          category.mutuallyExclusive.forEach(exclusiveId => {
            const hasExclusive = config.selectedProducts.some(p => p.categoryId === exclusiveId);
            if (hasExclusive) {
              const exclusiveCategory = this.state.categories.find(c => c.id === exclusiveId);
              validation.warnings.push({
                message: `Cannot have both ${category.displayName} and ${exclusiveCategory?.displayName || exclusiveId}`,
                severity: 'warning'
              });
            }
          });
        }
      }
    });

    // Run compatibility checker if loaded
    if (compatibilityChecker.loaded) {
      const compatibilityIssues = compatibilityChecker.checkConfiguration(
        config,
        this.state.categories
      );

      // Add compatibility errors
      if (compatibilityIssues.errors) {
        validation.compatibilityIssues.push(...compatibilityIssues.errors);
      }

      // Add compatibility warnings
      if (compatibilityIssues.warnings) {
        validation.warnings.push(...compatibilityIssues.warnings);
      }

      // Add compatibility info
      if (compatibilityIssues.info) {
        validation.info.push(...compatibilityIssues.info);
      }
    }

    return validation;
  }

  /**
   * Check if configuration is valid
   * @param {Object} validation
   * @returns {boolean}
   */
  isConfigurationValid(validation) {
    return validation.missingRequired.length === 0 &&
           validation.compatibilityIssues.length === 0;
  }

  /**
   * Clear configuration
   */
  clearConfiguration() {
    const newConfig = {
      ...deepClone(DEFAULT_CONFIG),
      id: generateId('CONFIG-'),
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        configurationName: 'תצורה חדשה'
      }
    };

    this.setState({ currentConfiguration: newConfig });
    this.emitEvent(EVENTS.CONFIGURATION_CLEARED);

    log.debug('Configuration cleared');
  }

  /**
   * Save configuration
   * @param {string} name
   */
  saveConfiguration(name) {
    const config = deepClone(this.state.currentConfiguration);
    config.metadata.configurationName = name || config.metadata.configurationName;
    config.state = CONFIG_STATES.SAVED;

    const savedConfigs = [...this.state.savedConfigurations];
    const existingIndex = savedConfigs.findIndex(c => c.id === config.id);

    if (existingIndex >= 0) {
      savedConfigs[existingIndex] = config;
    } else {
      savedConfigs.push(config);
    }

    this.setState({ savedConfigurations: savedConfigs });
    Storage.set(STORAGE_KEYS.SAVED_CONFIGS, savedConfigs);

    this.emitEvent(EVENTS.CONFIGURATION_SAVED, { configuration: config });

    log.debug('Configuration saved', config);
  }

  /**
   * Load configuration
   * @param {string} configId
   */
  loadConfiguration(configId) {
    const config = this.state.savedConfigurations.find(c => c.id === configId);

    if (config) {
      this.setState({ currentConfiguration: deepClone(config) });
      this.emitEvent(EVENTS.CONFIGURATION_LOADED, { configuration: config });

      log.debug('Configuration loaded', config);
    }
  }

  /**
   * Set loading state
   * @param {string} key
   * @param {boolean} value
   */
  setLoading(key, value) {
    this.setState({
      loading: {
        ...this.state.loading,
        [key]: value
      }
    });
  }

  /**
   * Set error
   * @param {Object} error
   */
  setError(error) {
    this.setState({ error });
    this.emitEvent(EVENTS.ERROR, error);
  }

  /**
   * Clear error
   */
  clearError() {
    this.setState({
      error: {
        hasError: false,
        message: '',
        code: ''
      }
    });
  }

  /**
   * Open modal
   * @param {string} type
   */
  openModal(type) {
    this.setState({
      ui: {
        ...this.state.ui,
        isModalOpen: true,
        modalType: type
      }
    });
    this.emitEvent(EVENTS.MODAL_OPEN, { type });
  }

  /**
   * Close modal
   */
  closeModal() {
    this.setState({
      ui: {
        ...this.state.ui,
        isModalOpen: false,
        modalType: null
      },
      currentCategory: null,
      currentCategoryProducts: []
    });
    this.emitEvent(EVENTS.MODAL_CLOSE);
  }

  /**
   * Set search query
   * @param {string} query
   */
  setSearchQuery(query) {
    this.setState({
      ui: {
        ...this.state.ui,
        searchQuery: query
      }
    });
  }

  /**
   * Set filters
   * @param {Object} filters
   */
  setFilters(filters) {
    this.setState({
      ui: {
        ...this.state.ui,
        filters: {
          ...this.state.ui.filters,
          ...filters
        }
      }
    });
  }

  /**
   * Set sort option
   * @param {string} sortBy
   */
  setSortBy(sortBy) {
    this.setState({
      ui: {
        ...this.state.ui,
        sortBy
      }
    });
  }

  /**
   * Save state to localStorage
   */
  saveToStorage() {
    Storage.set(STORAGE_KEYS.CURRENT_CONFIG, this.state.currentConfiguration);
    Storage.set(STORAGE_KEYS.PREFERENCES, this.state.preferences);
  }

  /**
   * Start auto-save
   */
  startAutoSave() {
    if (CONFIG.AUTO_SAVE && !this.autoSaveInterval) {
      this.autoSaveInterval = setInterval(() => {
        this.saveToStorage();
        log.debug('Auto-save triggered');
      }, CONFIG.SAVE_INTERVAL);
    }
  }

  /**
   * Stop auto-save
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Emit custom event
   * @param {string} eventName
   * @param {Object} detail
   */
  emitEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  }

  /**
   * Reset state to initial
   */
  reset() {
    this.state = this.getInitialState();
    this.notifySubscribers({}, this.state);
    log.debug('State reset');
  }

  /**
   * Destroy instance
   */
  destroy() {
    this.stopAutoSave();
    this.subscribers = [];
    StateManager.instance = null;
    log.debug('StateManager destroyed');
  }
}

// Export singleton instance
export default new StateManager();
