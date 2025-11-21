/**
 * Compatibility Checker Engine
 * @file compatibility-checker.js
 * @description Validates PC component compatibility based on configurable rules
 */

import { log } from './utils.js';

class CompatibilityChecker {
  constructor() {
    this.rules = [];
    this.fieldMappings = {};
    this.severityLevels = {};
    this.loaded = false;
  }

  /**
   * Load compatibility rules from configuration
   * @param {string} rulesUrl - URL to compatibility-rules.json
   */
  async loadRules(rulesUrl = '/files/configurator/config/compatibility-rules.json') {
    try {
      const response = await fetch(rulesUrl);
      if (!response.ok) {
        throw new Error('Failed to load compatibility rules');
      }

      const config = await response.json();
      this.rules = config.compatibilityRules || [];
      this.fieldMappings = config.fieldMappings || {};
      this.severityLevels = config.severityLevels || {};
      this.loaded = true;

      log.debug('CompatibilityChecker: Rules loaded', {
        rulesCount: this.rules.length
      });

      return true;
    } catch (error) {
      log.error('CompatibilityChecker: Error loading rules', error);
      return false;
    }
  }

  /**
   * Check compatibility for entire configuration
   * @param {Object} configuration - Configuration object with selectedProducts
   * @param {Array} categories - Array of category definitions
   * @returns {Object} Validation result with errors, warnings, and info
   */
  checkConfiguration(configuration, categories) {
    if (!this.loaded) {
      log.warn('CompatibilityChecker: Rules not loaded');
      return { errors: [], warnings: [], info: [] };
    }

    const issues = {
      errors: [],
      warnings: [],
      info: []
    };

    // Group products by category
    const productsByCategory = this.groupProductsByCategory(
      configuration.selectedProducts
    );

    // Check each rule
    this.rules.forEach(rule => {
      const ruleIssues = this.checkRule(rule, productsByCategory, categories);
      if (ruleIssues.length > 0) {
        ruleIssues.forEach(issue => {
          issues[issue.severity + 's'].push(issue);
        });
      }
    });

    log.debug('CompatibilityChecker: Check completed', {
      errors: issues.errors.length,
      warnings: issues.warnings.length,
      info: issues.info.length
    });

    return issues;
  }

  /**
   * Check a single compatibility rule
   * @param {Object} rule - Compatibility rule
   * @param {Object} productsByCategory - Products grouped by category ID
   * @param {Array} categories - Category definitions
   * @returns {Array} Array of compatibility issues
   */
  checkRule(rule, productsByCategory, categories) {
    const issues = [];

    const { categories: ruleCats, rule: ruleLogic } = rule;

    // Get primary products
    const primaryProducts = this.getProductsForCategories(
      ruleCats.primary,
      productsByCategory
    );

    // Get secondary products
    const secondaryProducts = ruleCats.secondary === 'all'
      ? this.getAllProducts(productsByCategory)
      : this.getProductsForCategories(ruleCats.secondary, productsByCategory);

    // If no products to check, skip
    if (primaryProducts.length === 0) {
      return issues;
    }

    // Apply rule based on type
    switch (ruleLogic.type) {
      case 'field_match':
        issues.push(...this.checkFieldMatch(
          rule,
          primaryProducts,
          secondaryProducts,
          ruleLogic
        ));
        break;

      case 'max_value':
        issues.push(...this.checkMaxValue(
          rule,
          primaryProducts,
          secondaryProducts,
          ruleLogic
        ));
        break;

      case 'array_contains':
        issues.push(...this.checkArrayContains(
          rule,
          primaryProducts,
          secondaryProducts,
          ruleLogic
        ));
        break;

      case 'total_power':
        issues.push(...this.checkTotalPower(
          rule,
          primaryProducts,
          productsByCategory,
          ruleLogic
        ));
        break;

      case 'power_connectors':
        issues.push(...this.checkPowerConnectors(
          rule,
          primaryProducts,
          secondaryProducts,
          ruleLogic
        ));
        break;

      case 'mutually_exclusive':
        issues.push(...this.checkMutuallyExclusive(
          rule,
          primaryProducts,
          secondaryProducts,
          ruleLogic
        ));
        break;

      case 'slot_count':
        issues.push(...this.checkSlotCount(
          rule,
          primaryProducts,
          secondaryProducts,
          ruleLogic
        ));
        break;

      case 'count_recommendation':
        issues.push(...this.checkCountRecommendation(
          rule,
          primaryProducts,
          ruleLogic
        ));
        break;

      default:
        log.warn('Unknown rule type:', ruleLogic.type);
    }

    return issues;
  }

  /**
   * Check field match rule (e.g., CPU socket must match motherboard socket)
   */
  checkFieldMatch(rule, primaryProducts, secondaryProducts, ruleLogic) {
    const issues = [];

    primaryProducts.forEach(primary => {
      const primaryValue = this.getFieldValue(primary.product, ruleLogic.primaryField);

      secondaryProducts.forEach(secondary => {
        const secondaryValue = this.getFieldValue(secondary.product, ruleLogic.secondaryField);

        if (primaryValue && secondaryValue && primaryValue !== secondaryValue) {
          issues.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: ruleLogic.message
              .replace('{primaryValue}', primaryValue)
              .replace('{secondaryValue}', secondaryValue),
            products: [primary.product.id, secondary.product.id]
          });
        }
      });
    });

    return issues;
  }

  /**
   * Check max value rule (e.g., GPU length must fit in case)
   */
  checkMaxValue(rule, primaryProducts, secondaryProducts, ruleLogic) {
    const issues = [];

    primaryProducts.forEach(primary => {
      const maxValue = this.getFieldValue(primary.product, ruleLogic.primaryField);

      secondaryProducts.forEach(secondary => {
        const actualValue = this.getFieldValue(secondary.product, ruleLogic.secondaryField);

        if (maxValue && actualValue && actualValue > maxValue) {
          issues.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: ruleLogic.message
              .replace('{primaryValue}', maxValue)
              .replace('{secondaryValue}', actualValue),
            products: [primary.product.id, secondary.product.id]
          });
        }
      });
    });

    return issues;
  }

  /**
   * Check array contains rule (e.g., CPU cooler supports CPU socket)
   */
  checkArrayContains(rule, primaryProducts, secondaryProducts, ruleLogic) {
    const issues = [];

    primaryProducts.forEach(primary => {
      const arrayValue = this.getFieldValue(primary.product, ruleLogic.primaryField);

      secondaryProducts.forEach(secondary => {
        const searchValue = this.getFieldValue(secondary.product, ruleLogic.secondaryField);

        if (arrayValue && searchValue) {
          const array = Array.isArray(arrayValue) ? arrayValue : [arrayValue];
          if (!array.includes(searchValue)) {
            issues.push({
              ruleId: rule.id,
              severity: rule.severity,
              message: ruleLogic.message
                .replace('{primaryValue}', array.join(', '))
                .replace('{secondaryValue}', searchValue),
              products: [primary.product.id, secondary.product.id]
            });
          }
        }
      });
    });

    return issues;
  }

  /**
   * Check total power consumption vs PSU wattage
   */
  checkTotalPower(rule, psuProducts, productsByCategory, ruleLogic) {
    const issues = [];

    if (psuProducts.length === 0) return issues;

    const psu = psuProducts[0];
    const psuWattage = this.getFieldValue(psu.product, ruleLogic.primaryField);

    if (!psuWattage) return issues;

    // Calculate total TDP
    let totalTDP = 0;
    Object.values(productsByCategory).forEach(products => {
      products.forEach(item => {
        const tdp = this.getFieldValue(item.product, ruleLogic.secondaryField) || 0;
        totalTDP += tdp;
      });
    });

    // Apply safety margin
    const requiredWattage = Math.ceil(totalTDP * (ruleLogic.safetyMargin || 1.2));

    if (psuWattage < requiredWattage) {
      issues.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: ruleLogic.message
          .replace('{primaryValue}', psuWattage)
          .replace('{requiredValue}', requiredWattage),
        products: [psu.product.id]
      });
    }

    return issues;
  }

  /**
   * Check power connectors (e.g., GPU needs 2x 8-pin PCIe)
   */
  checkPowerConnectors(rule, gpuProducts, psuProducts, ruleLogic) {
    const issues = [];

    if (gpuProducts.length === 0 || psuProducts.length === 0) return issues;

    gpuProducts.forEach(gpu => {
      const requiredConnectors = this.getFieldValue(gpu.product, ruleLogic.primaryField);

      psuProducts.forEach(psu => {
        const availableConnectors = this.getFieldValue(psu.product, ruleLogic.secondaryField);

        if (requiredConnectors && !this.hasRequiredConnectors(requiredConnectors, availableConnectors)) {
          issues.push({
            ruleId: rule.id,
            severity: rule.severity,
            message: ruleLogic.message
              .replace('{primaryValue}', this.formatConnectors(requiredConnectors)),
            products: [gpu.product.id, psu.product.id]
          });
        }
      });
    });

    return issues;
  }

  /**
   * Check mutually exclusive components
   */
  checkMutuallyExclusive(rule, primaryProducts, secondaryProducts, ruleLogic) {
    const issues = [];

    if (primaryProducts.length > 0 && secondaryProducts.length > 0) {
      issues.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: ruleLogic.message,
        products: [...primaryProducts.map(p => p.product.id), ...secondaryProducts.map(p => p.product.id)]
      });
    }

    return issues;
  }

  /**
   * Check slot count (e.g., M.2 slots, SATA ports)
   */
  checkSlotCount(rule, primaryProducts, secondaryProducts, ruleLogic) {
    const issues = [];

    if (primaryProducts.length === 0) return issues;

    const primary = primaryProducts[0];
    const availableSlots = this.getFieldValue(primary.product, ruleLogic.primaryField) || 0;

    // Count secondary products that need this slot type
    const requiredSlots = secondaryProducts.filter(item => {
      const interfaceType = this.getFieldValue(item.product, ruleLogic.secondaryField);
      return interfaceType === ruleLogic.secondaryValue;
    }).length;

    if (requiredSlots > availableSlots) {
      issues.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: ruleLogic.message
          .replace('{primaryValue}', availableSlots)
          .replace('{secondaryCount}', requiredSlots),
        products: [primary.product.id]
      });
    }

    return issues;
  }

  /**
   * Check count recommendation (e.g., RAM in pairs)
   */
  checkCountRecommendation(rule, primaryProducts, ruleLogic) {
    const issues = [];

    const count = primaryProducts.length;
    const preferredCounts = ruleLogic.preferredCounts || [];

    if (count > 0 && !preferredCounts.includes(count)) {
      issues.push({
        ruleId: rule.id,
        severity: rule.severity,
        message: ruleLogic.message,
        products: primaryProducts.map(p => p.product.id)
      });
    }

    return issues;
  }

  /**
   * Get field value from product, checking aliases
   */
  getFieldValue(product, fieldName) {
    if (!product || !product.specifications) return null;

    const specs = product.specifications;

    // Try direct field name
    if (specs[fieldName] !== undefined) {
      return specs[fieldName];
    }

    // Try aliases
    const mapping = this.fieldMappings[fieldName];
    if (mapping && mapping.aliases) {
      for (const alias of mapping.aliases) {
        if (specs[alias] !== undefined) {
          return specs[alias];
        }
      }
    }

    return null;
  }

  /**
   * Group products by category ID
   */
  groupProductsByCategory(selectedProducts) {
    const grouped = {};

    selectedProducts.forEach(item => {
      if (!grouped[item.categoryId]) {
        grouped[item.categoryId] = [];
      }
      grouped[item.categoryId].push(item);
    });

    return grouped;
  }

  /**
   * Get products for specific categories
   */
  getProductsForCategories(categoryIds, productsByCategory) {
    const products = [];

    categoryIds.forEach(catId => {
      if (productsByCategory[catId]) {
        products.push(...productsByCategory[catId]);
      }
    });

    return products;
  }

  /**
   * Get all products from all categories
   */
  getAllProducts(productsByCategory) {
    const products = [];

    Object.values(productsByCategory).forEach(catProducts => {
      products.push(...catProducts);
    });

    return products;
  }

  /**
   * Check if PSU has required power connectors
   */
  hasRequiredConnectors(required, available) {
    if (!required || !available) return true;

    // Parse connector strings like "2x 8-pin PCIe"
    // This is a simplified check - could be more sophisticated

    if (typeof required === 'string' && typeof available === 'string') {
      return available.includes(required);
    }

    if (typeof required === 'object' && typeof available === 'object') {
      for (const [key, count] of Object.entries(required)) {
        if ((available[key] || 0) < count) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Format connectors for display
   */
  formatConnectors(connectors) {
    if (typeof connectors === 'string') return connectors;
    if (typeof connectors === 'object') {
      return Object.entries(connectors)
        .map(([type, count]) => `${count}x ${type}`)
        .join(', ');
    }
    return String(connectors);
  }
}

// Export singleton instance
const compatibilityChecker = new CompatibilityChecker();
export default compatibilityChecker;
