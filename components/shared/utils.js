/**
 * Utility Functions for PC Configurator
 * @file utils.js
 * @description Helper functions used throughout the application
 */

import { CONFIG, ERROR_CODES, PATTERNS, DEBUG } from './constants.js';

/**
 * DOM Utilities
 */
export const DOM = {
  /**
   * Create an element with attributes and children
   * @param {string} tag - HTML tag name
   * @param {Object} attrs - Attributes
   * @param {Array|string} children - Child elements or text
   * @returns {HTMLElement}
   */
  createElement(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attrs).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else if (key.startsWith('on')) {
        const event = key.substring(2).toLowerCase();
        element.addEventListener(event, value);
      } else {
        element.setAttribute(key, value);
      }
    });

    // Add children
    const childArray = Array.isArray(children) ? children : [children];
    childArray.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof HTMLElement) {
        element.appendChild(child);
      }
    });

    return element;
  },

  /**
   * Query selector with error handling
   * @param {string} selector
   * @param {HTMLElement} parent
   * @returns {HTMLElement|null}
   */
  qs(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /**
   * Query selector all
   * @param {string} selector
   * @param {HTMLElement} parent
   * @returns {Array<HTMLElement>}
   */
  qsa(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  },

  /**
   * Add class to element
   * @param {HTMLElement} element
   * @param {string} className
   */
  addClass(element, className) {
    if (element) {
      element.classList.add(className);
    }
  },

  /**
   * Remove class from element
   * @param {HTMLElement} element
   * @param {string} className
   */
  removeClass(element, className) {
    if (element) {
      element.classList.remove(className);
    }
  },

  /**
   * Toggle class on element
   * @param {HTMLElement} element
   * @param {string} className
   */
  toggleClass(element, className) {
    if (element) {
      element.classList.toggle(className);
    }
  },

  /**
   * Check if element has class
   * @param {HTMLElement} element
   * @param {string} className
   * @returns {boolean}
   */
  hasClass(element, className) {
    return element ? element.classList.contains(className) : false;
  },

  /**
   * Remove all children from element
   * @param {HTMLElement} element
   */
  empty(element) {
    if (element) {
      while (element.firstChild) {
        element.removeChild(element.firstChild);
      }
    }
  },

  /**
   * Show element
   * @param {HTMLElement} element
   */
  show(element) {
    if (element) {
      element.style.display = '';
      this.removeClass(element, 'is-hidden');
    }
  },

  /**
   * Hide element
   * @param {HTMLElement} element
   */
  hide(element) {
    if (element) {
      element.style.display = 'none';
      this.addClass(element, 'is-hidden');
    }
  }
};

/**
 * String Utilities
 */
export const Str = {
  /**
   * Sanitize string for HTML output
   * @param {string} str
   * @returns {string}
   */
  sanitize(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Truncate string
   * @param {string} str
   * @param {number} length
   * @param {string} suffix
   * @returns {string}
   */
  truncate(str, length = 50, suffix = '...') {
    if (!str || str.length <= length) return str;
    return str.substring(0, length) + suffix;
  },

  /**
   * Slugify string
   * @param {string} str
   * @returns {string}
   */
  slugify(str) {
    return str
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  },

  /**
   * Format template string
   * @param {string} template
   * @param {Object} data
   * @returns {string}
   */
  format(template, data) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  },

  /**
   * Capitalize first letter
   * @param {string} str
   * @returns {string}
   */
  capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

/**
 * Number Utilities
 */
export const Num = {
  /**
   * Format price
   * @param {number} price
   * @param {string} currency
   * @param {boolean} includeSymbol
   * @returns {string}
   */
  formatPrice(price, currency = CONFIG.DEFAULT_CURRENCY, includeSymbol = true) {
    const formatted = parseFloat(price).toFixed(2);
    const symbol = currency === 'ILS' ? CONFIG.CURRENCY_SYMBOL : currency;
    return includeSymbol ? `${symbol}${formatted}` : formatted;
  },

  /**
   * Calculate VAT
   * @param {number} price
   * @param {number} rate
   * @returns {number}
   */
  calculateVAT(price, rate = CONFIG.VAT_RATE) {
    return price * rate;
  },

  /**
   * Add VAT to price
   * @param {number} price
   * @param {number} rate
   * @returns {number}
   */
  priceWithVAT(price, rate = CONFIG.VAT_RATE) {
    return price * (1 + rate);
  },

  /**
   * Calculate discount percentage
   * @param {number} original
   * @param {number} discounted
   * @returns {number}
   */
  discountPercent(original, discounted) {
    if (original === 0) return 0;
    return Math.round(((original - discounted) / original) * 100);
  },

  /**
   * Clamp number between min and max
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  },

  /**
   * Round to decimal places
   * @param {number} value
   * @param {number} decimals
   * @returns {number}
   */
  round(value, decimals = 2) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }
};

/**
 * Date Utilities
 */
export const DateTime = {
  /**
   * Format date
   * @param {Date|string} date
   * @param {string} format
   * @returns {string}
   */
  format(date, format = 'YYYY-MM-DD') {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return format
      .replace('YYYY', year)
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes);
  },

  /**
   * Get relative time string
   * @param {Date|string} date
   * @returns {string}
   */
  relative(date) {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `לפני ${days} ימים`;
    if (hours > 0) return `לפני ${hours} שעות`;
    if (minutes > 0) return `לפני ${minutes} דקות`;
    return 'כרגע';
  }
};

/**
 * Array Utilities
 */
export const Arr = {
  /**
   * Group array by key
   * @param {Array} array
   * @param {string|Function} key
   * @returns {Object}
   */
  groupBy(array, key) {
    return array.reduce((result, item) => {
      const groupKey = typeof key === 'function' ? key(item) : item[key];
      (result[groupKey] = result[groupKey] || []).push(item);
      return result;
    }, {});
  },

  /**
   * Remove duplicates
   * @param {Array} array
   * @param {string} key
   * @returns {Array}
   */
  unique(array, key = null) {
    if (!key) {
      return [...new Set(array)];
    }
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  },

  /**
   * Sort array by key
   * @param {Array} array
   * @param {string} key
   * @param {string} order
   * @returns {Array}
   */
  sortBy(array, key, order = 'asc') {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  },

  /**
   * Chunk array
   * @param {Array} array
   * @param {number} size
   * @returns {Array}
   */
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
};

/**
 * Storage Utilities
 */
export const Storage = {
  /**
   * Get item from localStorage
   * @param {string} key
   * @param {*} defaultValue
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      log.error('Storage get error:', error);
      return defaultValue;
    }
  },

  /**
   * Set item in localStorage
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      log.error('Storage set error:', error);
    }
  },

  /**
   * Remove item from localStorage
   * @param {string} key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      log.error('Storage remove error:', error);
    }
  },

  /**
   * Clear all items
   */
  clear() {
    try {
      localStorage.clear();
    } catch (error) {
      log.error('Storage clear error:', error);
    }
  }
};

/**
 * Validation Utilities
 */
export const Validate = {
  /**
   * Validate email
   * @param {string} email
   * @returns {boolean}
   */
  email(email) {
    return PATTERNS.EMAIL.test(email);
  },

  /**
   * Validate number
   * @param {*} value
   * @returns {boolean}
   */
  number(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
  },

  /**
   * Validate positive number
   * @param {*} value
   * @returns {boolean}
   */
  positiveNumber(value) {
    return this.number(value) && parseFloat(value) > 0;
  },

  /**
   * Validate integer
   * @param {*} value
   * @returns {boolean}
   */
  integer(value) {
    return Number.isInteger(Number(value));
  },

  /**
   * Validate required field
   * @param {*} value
   * @returns {boolean}
   */
  required(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
};

/**
 * Function Utilities
 */
export const Fn = {
  /**
   * Debounce function
   * @param {Function} func
   * @param {number} wait
   * @returns {Function}
   */
  debounce(func, wait = CONFIG.DEBOUNCE_DELAY) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function
   * @param {Function} func
   * @param {number} limit
   * @returns {Function}
   */
  throttle(func, limit = CONFIG.THROTTLE_DELAY) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Sleep/delay function
   * @param {number} ms
   * @returns {Promise}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retry function with exponential backoff
   * @param {Function} fn
   * @param {number} maxRetries
   * @param {number} delay
   * @returns {Promise}
   */
  async retry(fn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.sleep(delay * Math.pow(2, i));
      }
    }
  }
};

/**
 * Event Utilities
 */
export const Events = {
  /**
   * Emit custom event
   * @param {string} eventName
   * @param {*} detail
   * @param {HTMLElement} target
   */
  emit(eventName, detail = {}, target = document) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(event);
  },

  /**
   * Listen to event
   * @param {string} eventName
   * @param {Function} handler
   * @param {HTMLElement} target
   * @returns {Function} Unsubscribe function
   */
  on(eventName, handler, target = document) {
    target.addEventListener(eventName, handler);
    return () => target.removeEventListener(eventName, handler);
  },

  /**
   * Listen to event once
   * @param {string} eventName
   * @param {Function} handler
   * @param {HTMLElement} target
   */
  once(eventName, handler, target = document) {
    target.addEventListener(eventName, handler, { once: true });
  }
};

/**
 * URL Utilities
 */
export const URL = {
  /**
   * Get query parameter
   * @param {string} param
   * @returns {string|null}
   */
  getParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
  },

  /**
   * Set query parameter
   * @param {string} param
   * @param {string} value
   */
  setParam(param, value) {
    const url = new window.URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
  },

  /**
   * Build URL with parameters
   * @param {string} base
   * @param {Object} params
   * @returns {string}
   */
  build(base, params = {}) {
    const url = new window.URL(base, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return url.toString();
  }
};

/**
 * Logger
 */
export const log = {
  debug(...args) {
    if (DEBUG) console.log('[Configurator DEBUG]', ...args);
  },

  info(...args) {
    if (DEBUG) console.info('[Configurator INFO]', ...args);
  },

  warn(...args) {
    console.warn('[Configurator WARN]', ...args);
  },

  error(...args) {
    console.error('[Configurator ERROR]', ...args);
  }
};

/**
 * Generate unique ID
 * @param {string} prefix
 * @returns {string}
 */
export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}${timestamp}-${random}`;
}

/**
 * Deep clone object
 * @param {*} obj
 * @returns {*}
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if object is empty
 * @param {Object} obj
 * @returns {boolean}
 */
export function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

/**
 * Merge objects deeply
 * @param {Object} target
 * @param {Object} source
 * @returns {Object}
 */
export function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

/**
 * Check if value is object
 * @param {*} item
 * @returns {boolean}
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Format file size
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Copy to clipboard
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    log.error('Copy to clipboard failed:', error);
    return false;
  }
}

/**
 * Download JSON as file
 * @param {Object} data
 * @param {string} filename
 */
export function downloadJSON(data, filename = 'data.json') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
