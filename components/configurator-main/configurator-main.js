/**
 * PC Configurator Main Component
 * @file configurator-main.js
 * @description Main configurator component that initializes and orchestrates all sub-components
 */

import stateManager from '../shared/state-manager.js';
import KonimboAPI from '../../integration/konimbo-api.js';
import CategorySelector from '../category-selector/category-selector.js';
import ProductModal from '../product-modal/product-modal.js';
import BasketManager from '../basket-manager/basket-manager.js';
import { EVENTS } from '../shared/constants.js';
import { log, generateId } from '../shared/utils.js';

class PCConfigurator {
  constructor(options = {}) {
    this.options = {
      rootElement: options.rootElement || '#pc-configurator',
      configPath: options.configPath || '/files/configurator/config/categories.json',
      konimboStoreId: options.konimboStoreId || null,
      language: options.language || 'he',
      currency: options.currency || 'ILS',
      debug: options.debug || false,
      ...options
    };

    this.root = null;
    this.api = null;
    this.components = {};
    this.initialized = false;

    log.debug('PCConfigurator: Constructor', this.options);
  }

  /**
   * Initialize configurator
   */
  async init() {
    if (this.initialized) {
      log.warn('PCConfigurator: Already initialized');
      return;
    }

    log.debug('PCConfigurator: Initializing');

    try {
      // Get root element
      this.root = typeof this.options.rootElement === 'string'
        ? document.querySelector(this.options.rootElement)
        : this.options.rootElement;

      if (!this.root) {
        throw new Error('Root element not found');
      }

      // Initialize API
      this.api = new KonimboAPI({
        storeId: this.options.konimboStoreId
      });

      // Load HTML templates
      await this.loadTemplates();

      // Initialize components
      this.initializeComponents();

      // Load configuration
      await this.loadConfiguration();

      // Set up error handling
      this.setupErrorHandling();

      // Start auto-save
      stateManager.startAutoSave();

      this.initialized = true;

      log.debug('PCConfigurator: Initialized successfully');

    } catch (error) {
      log.error('PCConfigurator: Initialization error', error);
      this.showError('שגיאה באתחול בונה המחשבים. אנא רענן את הדף.');
      throw error;
    }
  }

  /**
   * Load HTML templates
   */
  async loadTemplates() {
    log.debug('PCConfigurator: Loading templates');

    // In a production environment, templates would be loaded via fetch
    // For now, we assume they're already in the DOM or will be injected

    // Load category selector template
    await this.loadTemplate(
      '/files/configurator/components/category-selector/category-selector.html',
      '#category-selector-root'
    );

    // Load basket manager template
    await this.loadTemplate(
      '/files/configurator/components/basket-manager/basket-manager.html',
      '#basket-manager-root'
    );

    // Load product modal template
    await this.loadTemplate(
      '/files/configurator/components/product-modal/product-modal.html',
      '#product-modal-root'
    );
  }

  /**
   * Load single template
   * @param {string} url
   * @param {string} target
   */
  async loadTemplate(url, target) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load template: ${url}`);
      }

      const html = await response.text();
      const targetEl = document.querySelector(target);

      if (targetEl) {
        targetEl.innerHTML = html;
      }
    } catch (error) {
      log.error('Error loading template:', url, error);
      // Templates might be embedded in the page, so this is not critical
    }
  }

  /**
   * Initialize sub-components
   */
  initializeComponents() {
    log.debug('PCConfigurator: Initializing components');

    // Initialize Category Selector
    const categorySelectorRoot = document.querySelector('#category-selector');
    if (categorySelectorRoot) {
      this.components.categorySelector = new CategorySelector(categorySelectorRoot);
    }

    // Initialize Product Modal
    const productModalRoot = document.querySelector('#product-modal');
    if (productModalRoot) {
      this.components.productModal = new ProductModal(productModalRoot);
    }

    // Initialize Basket Manager
    const basketManagerRoot = document.querySelector('#basket-manager');
    if (basketManagerRoot) {
      this.components.basketManager = new BasketManager(basketManagerRoot);
    }

    log.debug('PCConfigurator: Components initialized');
  }

  /**
   * Load configuration (categories)
   */
  async loadConfiguration() {
    log.debug('PCConfigurator: Loading configuration');

    stateManager.setLoading('categories', true);

    try {
      // Load categories from config file
      const response = await fetch(this.options.configPath);

      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }

      const config = await response.json();
      const categories = config.categories || [];

      // Set categories in state
      stateManager.setCategories(categories);

      // Initialize new configuration if needed
      const currentConfig = stateManager.getState().currentConfiguration;
      if (!currentConfig.id) {
        stateManager.setState({
          currentConfiguration: {
            ...currentConfig,
            id: generateId('CONFIG-'),
            metadata: {
              ...currentConfig.metadata,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        });
      }

      log.debug('PCConfigurator: Configuration loaded', { categories });

    } catch (error) {
      log.error('PCConfigurator: Error loading configuration', error);
      this.showError('שגיאה בטעינת קטגוריות. אנא נסה שוב.');
    } finally {
      stateManager.setLoading('categories', false);
    }
  }

  /**
   * Set up error handling
   */
  setupErrorHandling() {
    // Listen to error events
    document.addEventListener(EVENTS.ERROR, (e) => {
      const { message } = e.detail;
      this.showError(message);
    });

    // Global error handler
    window.addEventListener('error', (e) => {
      log.error('Global error:', e);
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      log.error('Unhandled promise rejection:', e.reason);
    });
  }

  /**
   * Show error toast
   * @param {string} message
   */
  showError(message) {
    const errorToast = document.querySelector('#error-toast');
    const errorMessage = document.querySelector('#error-message');

    if (errorToast && errorMessage) {
      errorMessage.textContent = message;
      errorToast.style.display = 'flex';

      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorToast.style.display = 'none';
      }, 5000);
    } else {
      // Fallback to alert
      alert(message);
    }
  }

  /**
   * Get current configuration
   * @returns {Object}
   */
  getConfiguration() {
    return stateManager.getState().currentConfiguration;
  }

  /**
   * Load saved configuration
   * @param {string} configId
   */
  loadConfiguration(configId) {
    stateManager.loadConfiguration(configId);
  }

  /**
   * Clear current configuration
   */
  clearConfiguration() {
    if (confirm('האם לנקות את התצורה הנוכחית?')) {
      stateManager.clearConfiguration();
    }
  }

  /**
   * Export configuration as JSON
   * @returns {string}
   */
  exportConfiguration() {
    const config = this.getConfiguration();
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from JSON
   * @param {string} jsonString
   */
  importConfiguration(jsonString) {
    try {
      const config = JSON.parse(jsonString);
      stateManager.setState({ currentConfiguration: config });
    } catch (error) {
      log.error('Error importing configuration:', error);
      this.showError('שגיאה בייבוא תצורה');
    }
  }

  /**
   * Destroy configurator
   */
  destroy() {
    log.debug('PCConfigurator: Destroying');

    // Stop auto-save
    stateManager.stopAutoSave();

    // Destroy components
    Object.values(this.components).forEach(component => {
      if (component && typeof component.destroy === 'function') {
        component.destroy();
      }
    });

    this.components = {};
    this.initialized = false;

    log.debug('PCConfigurator: Destroyed');
  }
}

// Make it globally available
if (typeof window !== 'undefined') {
  window.PCConfigurator = PCConfigurator;
}

export default PCConfigurator;
