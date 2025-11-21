/**
 * Configuration Manager
 * @file config-manager.js
 * @description Manages saving, loading, and sharing PC configurations
 */

import { Storage, log } from './utils.js';

class ConfigManager {
  constructor() {
    this.storageKey = 'pc_configurations';
  }

  /**
   * Generate unique configuration code
   * Format: PC-XXXXXX (6 alphanumeric characters)
   * @returns {string}
   */
  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'PC-';

    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code already exists
    const existing = this.loadByCode(code);
    if (existing) {
      // Recursively generate new code if collision
      return this.generateCode();
    }

    return code;
  }

  /**
   * Save configuration with unique code
   * @param {Object} configuration - Configuration object with selectedProducts
   * @param {string} customerName - Optional customer name
   * @returns {string} Configuration code
   */
  saveConfiguration(configuration, customerName = '') {
    const code = this.generateCode();

    const configData = {
      code: code,
      customerName: customerName,
      configuration: configuration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalPrice: configuration.totalPrice || 0,
      itemCount: configuration.selectedProducts.length
    };

    // Get existing configurations
    const configs = this.getAllConfigurations();
    configs[code] = configData;

    // Save to storage
    Storage.set(this.storageKey, configs);

    log.debug('ConfigManager: Configuration saved', { code });

    return code;
  }

  /**
   * Load configuration by code
   * @param {string} code - Configuration code
   * @returns {Object|null} Configuration data or null if not found
   */
  loadByCode(code) {
    const configs = this.getAllConfigurations();
    const configData = configs[code.toUpperCase()];

    if (!configData) {
      log.warn('ConfigManager: Configuration not found', { code });
      return null;
    }

    log.debug('ConfigManager: Configuration loaded', { code });

    return configData;
  }

  /**
   * Update existing configuration
   * @param {string} code - Configuration code
   * @param {Object} configuration - Updated configuration
   * @returns {boolean} Success status
   */
  updateConfiguration(code, configuration) {
    const configs = this.getAllConfigurations();
    const existing = configs[code.toUpperCase()];

    if (!existing) {
      log.warn('ConfigManager: Cannot update, configuration not found', { code });
      return false;
    }

    existing.configuration = configuration;
    existing.updatedAt = new Date().toISOString();
    existing.totalPrice = configuration.totalPrice || 0;
    existing.itemCount = configuration.selectedProducts.length;

    Storage.set(this.storageKey, configs);

    log.debug('ConfigManager: Configuration updated', { code });

    return true;
  }

  /**
   * Delete configuration by code
   * @param {string} code - Configuration code
   * @returns {boolean} Success status
   */
  deleteConfiguration(code) {
    const configs = this.getAllConfigurations();

    if (!configs[code.toUpperCase()]) {
      log.warn('ConfigManager: Cannot delete, configuration not found', { code });
      return false;
    }

    delete configs[code.toUpperCase()];
    Storage.set(this.storageKey, configs);

    log.debug('ConfigManager: Configuration deleted', { code });

    return true;
  }

  /**
   * Get all saved configurations
   * @returns {Object} All configurations keyed by code
   */
  getAllConfigurations() {
    return Storage.get(this.storageKey) || {};
  }

  /**
   * Get recent configurations
   * @param {number} limit - Number of recent configs to return
   * @returns {Array} Array of configuration data
   */
  getRecentConfigurations(limit = 10) {
    const configs = this.getAllConfigurations();

    return Object.values(configs)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, limit);
  }

  /**
   * Check stock status for configuration products
   * @param {Object} configuration - Configuration to check
   * @param {Function} checkStockFn - Function to check product stock (productId) => Promise<boolean>
   * @returns {Promise<Object>} Object with inStock and outOfStock arrays
   */
  async checkStockStatus(configuration, checkStockFn) {
    const results = {
      inStock: [],
      outOfStock: []
    };

    for (const item of configuration.selectedProducts) {
      const isInStock = await checkStockFn(item.product.id);

      if (isInStock) {
        results.inStock.push(item);
      } else {
        results.outOfStock.push(item);
      }
    }

    log.debug('ConfigManager: Stock status checked', {
      inStock: results.inStock.length,
      outOfStock: results.outOfStock.length
    });

    return results;
  }

  /**
   * Export configuration for printing
   * @param {string} code - Configuration code
   * @returns {Object|null} Print-ready configuration data
   */
  exportForPrint(code) {
    const configData = this.loadByCode(code);

    if (!configData) {
      return null;
    }

    const printData = {
      code: configData.code,
      customerName: configData.customerName,
      createdDate: new Date(configData.createdAt).toLocaleDateString('he-IL'),
      createdTime: new Date(configData.createdAt).toLocaleTimeString('he-IL'),
      items: configData.configuration.selectedProducts.map(item => ({
        categoryName: item.categoryName || 'לא מוגדר',
        productName: item.product.name,
        productSKU: item.product.sku,
        quantity: item.quantity,
        price: item.product.price,
        totalPrice: item.product.price * item.quantity,
        image: item.product.primaryImage
      })),
      totalPrice: configData.totalPrice,
      itemCount: configData.itemCount
    };

    return printData;
  }

  /**
   * Clean old configurations (older than specified days)
   * @param {number} days - Number of days to keep
   * @returns {number} Number of deleted configurations
   */
  cleanOldConfigurations(days = 30) {
    const configs = this.getAllConfigurations();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let deletedCount = 0;

    Object.entries(configs).forEach(([code, configData]) => {
      const updatedDate = new Date(configData.updatedAt);

      if (updatedDate < cutoffDate) {
        delete configs[code];
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      Storage.set(this.storageKey, configs);
      log.debug('ConfigManager: Cleaned old configurations', { deletedCount });
    }

    return deletedCount;
  }

  /**
   * Export configuration as shareable URL
   * @param {string} code - Configuration code
   * @returns {string} Shareable URL
   */
  generateShareUrl(code) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?config=${code.toUpperCase()}`;
  }

  /**
   * Get configuration code from URL
   * @returns {string|null} Configuration code from URL or null
   */
  getCodeFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('config');

    return code ? code.toUpperCase() : null;
  }
}

// Export singleton instance
const configManager = new ConfigManager();
export default configManager;
