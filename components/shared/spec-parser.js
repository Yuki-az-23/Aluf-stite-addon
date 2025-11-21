/**
 * Product Specification Parser
 * @file spec-parser.js
 * @description Parses and normalizes product specifications from various formats
 */

import { log } from './utils.js';

/**
 * Specification Parser
 * Extracts component specifications from product data
 */
class SpecParser {
  constructor() {
    // Common patterns for extracting specs from product names/descriptions
    this.patterns = {
      // CPU Socket patterns
      socket: [
        /(?:Socket|socket)\s*(LGA\s*\d+|AM\d+)/i,
        /(LGA\s*\d+|AM\d+)/i
      ],

      // Memory type
      memoryType: [
        /(DDR\d+)/i
      ],

      // Memory speed
      memorySpeed: [
        /(\d{3,4})\s*(?:MHz|mhz)/i,
        /(DDR\d+[-\s]?\d{3,4})/i
      ],

      // Form factor
      formFactor: [
        /(ATX|E-ATX|Micro-ATX|Mini-ITX|mATX)/i
      ],

      // Power/Wattage
      wattage: [
        /(\d{3,4})\s*(?:W|Watt|watts?)/i
      ],

      // TDP
      tdp: [
        /TDP\s*:?\s*(\d+)\s*W/i,
        /(\d+)\s*W\s*TDP/i
      ],

      // PCIe Generation
      pcieGen: [
        /PCIe?\s*(?:Gen)?\s*(\d)/i,
        /Gen\s*(\d)\s*PCIe?/i
      ],

      // Dimensions
      length: [
        /(?:Length|length|L)\s*:?\s*(\d+)\s*mm/i
      ],

      height: [
        /(?:Height|height|H)\s*:?\s*(\d+)\s*mm/i
      ],

      width: [
        /(?:Width|width|W)\s*:?\s*(\d+)\s*mm/i
      ]
    };
  }

  /**
   * Parse all specifications from product
   * @param {Object} product - Product object
   * @returns {Object} Parsed specifications
   */
  parse(product) {
    if (!product) return {};

    const specs = {};

    // Start with existing specifications
    if (product.specifications) {
      Object.assign(specs, product.specifications);
    }

    // Extract from product name
    if (product.name) {
      const nameSpecs = this.extractFromText(product.name);
      Object.assign(specs, nameSpecs);
    }

    // Extract from description
    if (product.description) {
      const descSpecs = this.extractFromText(product.description);
      // Only add if not already present (name takes precedence)
      Object.keys(descSpecs).forEach(key => {
        if (!specs[key]) {
          specs[key] = descSpecs[key];
        }
      });
    }

    // Extract from attributes/tags
    if (product.tags && Array.isArray(product.tags)) {
      const tagSpecs = this.extractFromTags(product.tags);
      Object.keys(tagSpecs).forEach(key => {
        if (!specs[key]) {
          specs[key] = tagSpecs[key];
        }
      });
    }

    // Normalize values
    return this.normalizeSpecs(specs);
  }

  /**
   * Extract specifications from text
   * @param {string} text
   * @returns {Object}
   */
  extractFromText(text) {
    const specs = {};

    Object.keys(this.patterns).forEach(specKey => {
      const patterns = this.patterns[specKey];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          specs[specKey] = match[1].trim();
          break;
        }
      }
    });

    return specs;
  }

  /**
   * Extract specifications from tags
   * @param {Array} tags
   * @returns {Object}
   */
  extractFromTags(tags) {
    const specs = {};

    tags.forEach(tag => {
      // Check if tag matches any pattern
      const tagSpecs = this.extractFromText(tag);
      Object.assign(specs, tagSpecs);
    });

    return specs;
  }

  /**
   * Normalize specification values
   * @param {Object} specs
   * @returns {Object}
   */
  normalizeSpecs(specs) {
    const normalized = { ...specs };

    // Normalize socket names
    if (normalized.socket) {
      normalized.socket = this.normalizeSocket(normalized.socket);
    }

    // Normalize memory type
    if (normalized.memoryType) {
      normalized.memoryType = normalized.memoryType.toUpperCase().replace(/[-\s]/g, '');
    }

    // Convert numeric strings to numbers
    ['memorySpeed', 'wattage', 'tdp', 'length', 'height', 'width', 'pcieGen'].forEach(key => {
      if (normalized[key]) {
        const num = parseInt(String(normalized[key]).replace(/\D/g, ''));
        if (!isNaN(num)) {
          normalized[key] = num;
        }
      }
    });

    // Normalize form factor
    if (normalized.formFactor) {
      normalized.formFactor = this.normalizeFormFactor(normalized.formFactor);
    }

    return normalized;
  }

  /**
   * Normalize socket name
   */
  normalizeSocket(socket) {
    const normalized = socket.toUpperCase().replace(/\s+/g, ' ').trim();

    // Common normalizations
    const socketMap = {
      'LGA1700': 'LGA 1700',
      'LGA1200': 'LGA 1200',
      'LGA1151': 'LGA 1151',
      'AM5': 'AM5',
      'AM4': 'AM4'
    };

    return socketMap[normalized.replace(/\s/g, '')] || normalized;
  }

  /**
   * Normalize form factor
   */
  normalizeFormFactor(formFactor) {
    const normalized = formFactor.toUpperCase().trim();

    const formFactorMap = {
      'MATX': 'Micro-ATX',
      'MICRO ATX': 'Micro-ATX',
      'MICROATX': 'Micro-ATX',
      'MINI ITX': 'Mini-ITX',
      'MINIITX': 'Mini-ITX',
      'E ATX': 'E-ATX',
      'EATX': 'E-ATX',
      'ATX': 'ATX'
    };

    return formFactorMap[normalized.replace(/-/g, ' ')] || normalized;
  }

  /**
   * Extract supported sockets from cooler description
   * @param {string} text
   * @returns {Array|null}
   */
  extractSupportedSockets(text) {
    const sockets = [];
    const socketPattern = /(LGA\s*\d+|AM\d+)/gi;
    let match;

    while ((match = socketPattern.exec(text)) !== null) {
      const normalized = this.normalizeSocket(match[0]);
      if (!sockets.includes(normalized)) {
        sockets.push(normalized);
      }
    }

    return sockets.length > 0 ? sockets : null;
  }

  /**
   * Extract supported form factors from case description
   * @param {string} text
   * @returns {Array|null}
   */
  extractSupportedFormFactors(text) {
    const formFactors = [];
    const ffPattern = /(E-ATX|ATX|Micro-ATX|Mini-ITX|mATX)/gi;
    let match;

    while ((match = ffPattern.exec(text)) !== null) {
      const normalized = this.normalizeFormFactor(match[0]);
      if (!formFactors.includes(normalized)) {
        formFactors.push(normalized);
      }
    }

    return formFactors.length > 0 ? formFactors : null;
  }

  /**
   * Extract power connectors from product description
   * @param {string} text
   * @returns {Object|null}
   */
  extractPowerConnectors(text) {
    const connectors = {};

    // Look for patterns like "2x 8-pin PCIe" or "1x 24-pin ATX"
    const connectorPattern = /(\d+)\s*x?\s*(\d+)[-\s]?pin\s*(\w+)/gi;
    let match;

    while ((match = connectorPattern.exec(text)) !== null) {
      const count = parseInt(match[1]);
      const pins = match[2];
      const type = match[3].toLowerCase();

      const key = `${pins}-pin ${type}`;
      connectors[key] = (connectors[key] || 0) + count;
    }

    return Object.keys(connectors).length > 0 ? connectors : null;
  }

  /**
   * Auto-detect category-specific specifications
   * @param {Object} product
   * @param {number} categoryId
   * @returns {Object}
   */
  parseByCategory(product, categoryId) {
    const specs = this.parse(product);

    // Category-specific parsing
    switch (categoryId) {
      case 32: // Intel CPU
      case 33: // AMD CPU
        return this.parseCPU(product, specs);

      case 17: // Motherboard
        return this.parseMotherboard(product, specs);

      case 169: // RAM
        return this.parseRAM(product, specs);

      case 64: // PSU
        return this.parsePSU(product, specs);

      case 34: // Air Cooling
      case 40: // Liquid Cooling
        return this.parseCooler(product, specs);

      case 82: // GPU
        return this.parseGPU(product, specs);

      case 95: // Case
        return this.parseCase(product, specs);

      case 172: // SSD
        return this.parseSSD(product, specs);

      default:
        return specs;
    }
  }

  /**
   * Parse CPU specifications
   */
  parseCPU(product, specs) {
    // CPUs typically have socket and TDP
    const text = `${product.name} ${product.description || ''}`;

    if (!specs.socket) {
      const socketMatch = text.match(/(?:Socket|socket)\s*(LGA\s*\d+|AM\d+)/i);
      if (socketMatch) specs.socket = this.normalizeSocket(socketMatch[1]);
    }

    if (!specs.tdp) {
      const tdpMatch = text.match(/(\d+)\s*W\s*TDP/i);
      if (tdpMatch) specs.tdp = parseInt(tdpMatch[1]);
    }

    return specs;
  }

  /**
   * Parse Motherboard specifications
   */
  parseMotherboard(product, specs) {
    const text = `${product.name} ${product.description || ''}`;

    // Extract supported memory type and max speed
    if (!specs.memoryType) {
      const memMatch = text.match(/(DDR\d+)/i);
      if (memMatch) specs.memoryType = memMatch[1].toUpperCase();
    }

    if (!specs.maxMemorySpeed) {
      const speedMatch = text.match(/(\d{4,5})\s*MHz/i);
      if (speedMatch) specs.maxMemorySpeed = parseInt(speedMatch[1]);
    }

    // Extract M.2 slots
    if (!specs.m2Slots) {
      const m2Match = text.match(/(\d+)\s*x?\s*M\.2/i);
      if (m2Match) specs.m2Slots = parseInt(m2Match[1]);
    }

    // Extract SATA ports
    if (!specs.sataPorts) {
      const sataMatch = text.match(/(\d+)\s*x?\s*SATA/i);
      if (sataMatch) specs.sataPorts = parseInt(sataMatch[1]);
    }

    return specs;
  }

  /**
   * Parse RAM specifications
   */
  parseRAM(product, specs) {
    // RAM has type and speed
    const text = `${product.name} ${product.description || ''}`;

    if (!specs.memoryType) {
      const typeMatch = text.match(/(DDR\d+)/i);
      if (typeMatch) specs.memoryType = typeMatch[1].toUpperCase();
    }

    if (!specs.memorySpeed) {
      const speedMatch = text.match(/(\d{4})/);
      if (speedMatch) specs.memorySpeed = parseInt(speedMatch[1]);
    }

    return specs;
  }

  /**
   * Parse PSU specifications
   */
  parsePSU(product, specs) {
    const text = `${product.name} ${product.description || ''}`;

    // Extract wattage
    if (!specs.wattage) {
      const wattMatch = text.match(/(\d{3,4})\s*W/i);
      if (wattMatch) specs.wattage = parseInt(wattMatch[1]);
    }

    // Extract power connectors
    if (!specs.availableConnectors) {
      specs.availableConnectors = this.extractPowerConnectors(text);
    }

    return specs;
  }

  /**
   * Parse Cooler specifications
   */
  parseCooler(product, specs) {
    const text = `${product.name} ${product.description || ''}`;

    // Extract supported sockets
    if (!specs.supportedSockets) {
      specs.supportedSockets = this.extractSupportedSockets(text);
    }

    // Extract height (for clearance checks)
    if (!specs.height) {
      const heightMatch = text.match(/(?:Height|height)\s*:?\s*(\d+)\s*mm/i);
      if (heightMatch) specs.height = parseInt(heightMatch[1]);
    }

    return specs;
  }

  /**
   * Parse GPU specifications
   */
  parseGPU(product, specs) {
    const text = `${product.name} ${product.description || ''}`;

    // Extract length
    if (!specs.length) {
      const lengthMatch = text.match(/(?:Length|length)\s*:?\s*(\d+)\s*mm/i);
      if (lengthMatch) specs.length = parseInt(lengthMatch[1]);
    }

    // Extract TDP/Power
    if (!specs.tdp) {
      const tdpMatch = text.match(/(\d{2,3})\s*W/i);
      if (tdpMatch) specs.tdp = parseInt(tdpMatch[1]);
    }

    // Extract power connectors requirement
    if (!specs.powerConnectors) {
      specs.powerConnectors = this.extractPowerConnectors(text);
    }

    return specs;
  }

  /**
   * Parse Case specifications
   */
  parseCase(product, specs) {
    const text = `${product.name} ${product.description || ''}`;

    // Extract supported form factors
    if (!specs.supportedFormFactors) {
      specs.supportedFormFactors = this.extractSupportedFormFactors(text);
    }

    // Extract max GPU length
    if (!specs.maxGPULength) {
      const gpuMatch = text.match(/GPU\s*(?:length)?\s*:?\s*(\d+)\s*mm/i);
      if (gpuMatch) specs.maxGPULength = parseInt(gpuMatch[1]);
    }

    // Extract max cooler height
    if (!specs.maxCoolerHeight) {
      const coolerMatch = text.match(/(?:CPU\s*cooler|cooler)\s*(?:height)?\s*:?\s*(\d+)\s*mm/i);
      if (coolerMatch) specs.maxCoolerHeight = parseInt(coolerMatch[1]);
    }

    return specs;
  }

  /**
   * Parse SSD specifications
   */
  parseSSD(product, specs) {
    const text = `${product.name} ${product.description || ''}`;

    // Detect interface (M.2 vs SATA)
    if (!specs.interface) {
      if (text.match(/M\.2|NVMe/i)) {
        specs.interface = 'M.2';
      } else if (text.match(/SATA/i)) {
        specs.interface = 'SATA';
      }
    }

    // Extract PCIe generation for NVMe
    if (specs.interface === 'M.2' && !specs.pcieGen) {
      const genMatch = text.match(/PCIe?\s*(?:Gen)?\s*(\d)/i);
      if (genMatch) specs.pcieGen = parseInt(genMatch[1]);
    }

    return specs;
  }
}

// Export singleton
const specParser = new SpecParser();
export default specParser;
