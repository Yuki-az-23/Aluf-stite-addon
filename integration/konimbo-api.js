/**
 * Konimbo API Integration
 * @file konimbo-api.js
 * @description Handles all API communication with Konimbo platform
 */

import { API_ENDPOINTS, HTTP_STATUS, ERROR_CODES } from '../components/shared/constants.js';
import { log, Fn, generateId } from '../components/shared/utils.js';

/**
 * API Cache for caching product data
 */
class APICache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  delete(key) {
    this.cache.delete(key);
  }
}

/**
 * Konimbo API Client
 */
class KonimboAPI {
  constructor(options = {}) {
    this.baseURL = options.baseURL || '';
    this.storeId = options.storeId || this.getStoreId();
    this.cache = new APICache(options.cacheTTL);
    this.requestTimeout = options.timeout || 30000; // 30 seconds
  }

  /**
   * Get store ID from Konimbo global object
   * @returns {number|null}
   */
  getStoreId() {
    if (typeof window !== 'undefined' && window.KonimboApp) {
      return window.KonimboApp.storeId || null;
    }
    return null;
  }

  /**
   * Make HTTP request
   * @param {string} url
   * @param {Object} options
   * @returns {Promise}
   */
  async request(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      // Check response status
      if (!response.ok) {
        throw this.handleHTTPError(response);
      }

      // Parse JSON
      const data = await response.json();
      return data;

    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(ERROR_CODES.TIMEOUT_ERROR);
      }

      throw error;
    }
  }

  /**
   * Handle HTTP errors
   * @param {Response} response
   * @returns {Error}
   */
  handleHTTPError(response) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);

    switch (response.status) {
      case HTTP_STATUS.BAD_REQUEST:
        error.code = ERROR_CODES.VALIDATION_ERROR;
        break;
      case HTTP_STATUS.UNAUTHORIZED:
        error.code = ERROR_CODES.UNAUTHORIZED;
        break;
      case HTTP_STATUS.FORBIDDEN:
        error.code = ERROR_CODES.UNAUTHORIZED;
        break;
      case HTTP_STATUS.NOT_FOUND:
        error.code = ERROR_CODES.NOT_FOUND;
        break;
      case HTTP_STATUS.SERVER_ERROR:
        error.code = ERROR_CODES.API_ERROR;
        break;
      default:
        error.code = ERROR_CODES.UNKNOWN_ERROR;
    }

    return error;
  }

  /**
   * Get all categories
   * @returns {Promise<Array>}
   */
  async getCategories() {
    const cacheKey = 'categories';
    const cached = this.cache.get(cacheKey);

    if (cached) {
      log.debug('Returning cached categories');
      return cached;
    }

    try {
      log.debug('Fetching categories from API');

      const url = `${this.baseURL}${API_ENDPOINTS.CATEGORIES}`;
      const data = await this.request(url);

      const categories = data.categories || data || [];

      this.cache.set(cacheKey, categories);
      return categories;

    } catch (error) {
      log.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get products by category ID
   * @param {number} categoryId
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getProductsByCategory(categoryId, options = {}) {
    const {
      page = 1,
      perPage = 50,
      filters = {},
      sortBy = null
    } = options;

    const cacheKey = `category_${categoryId}_page_${page}_${JSON.stringify(filters)}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      log.debug(`Returning cached products for category ${categoryId}`);
      return cached;
    }

    try {
      log.debug(`Fetching products for category ${categoryId}`);

      let url = `${this.baseURL}/categories/${categoryId}/products.json`;

      // Add query parameters
      const params = new URLSearchParams();
      if (page > 1) params.append('page', page);
      if (perPage !== 50) params.append('per_page', perPage);

      if (params.toString()) {
        url += '?' + params.toString();
      }

      const data = await this.request(url);

      let products = data.products || data || [];

      // Apply filters
      products = this.applyFilters(products, filters);

      // Apply sorting
      if (sortBy) {
        products = this.sortProducts(products, sortBy);
      }

      // Transform products to our format
      products = products.map(p => this.transformProduct(p));

      this.cache.set(cacheKey, products);
      return products;

    } catch (error) {
      log.error(`Error fetching products for category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Get single product by ID
   * @param {number} productId
   * @returns {Promise<Object>}
   */
  async getProduct(productId) {
    const cacheKey = `product_${productId}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      log.debug(`Returning cached product ${productId}`);
      return cached;
    }

    try {
      log.debug(`Fetching product ${productId}`);

      const url = `${this.baseURL}/products/${productId}.json`;
      const data = await this.request(url);

      const product = this.transformProduct(data.product || data);

      this.cache.set(cacheKey, product);
      return product;

    } catch (error) {
      log.error(`Error fetching product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Transform Konimbo product to our format
   * @param {Object} konimboProduct
   * @returns {Object}
   */
  transformProduct(konimboProduct) {
    return {
      id: konimboProduct.id,
      sku: konimboProduct.code || konimboProduct.second_code || `PRODUCT-${konimboProduct.id}`,
      name: konimboProduct.title,
      description: konimboProduct.desc || '',
      price: parseFloat(konimboProduct.price) || 0,
      originalPrice: parseFloat(konimboProduct.price_before_sale) || parseFloat(konimboProduct.price) || 0,
      currency: 'ILS',
      categoryId: konimboProduct.category_id || null,
      categoryName: konimboProduct.category_title || '',
      images: (konimboProduct.images || []).map(img => ({
        url: img.url || img,
        alt: img.alt || konimboProduct.title,
        isPrimary: img.position === 0
      })),
      primaryImage: konimboProduct.images && konimboProduct.images.length > 0
        ? konimboProduct.images[0].url || konimboProduct.images[0]
        : null,
      inStock: konimboProduct.visible && (konimboProduct.quantity === null || konimboProduct.quantity > 0),
      stockQuantity: konimboProduct.quantity,
      specifications: konimboProduct.attributes || {},
      url: konimboProduct.url || `/products/${konimboProduct.id}`,
      onSale: konimboProduct.price_before_sale > konimboProduct.price,
      discountPercent: this.calculateDiscountPercent(
        konimboProduct.price_before_sale,
        konimboProduct.price
      ),
      weight: konimboProduct.weight || 0,
      tags: konimboProduct.tags || [],
      konimboData: {
        productId: konimboProduct.id,
        variantId: konimboProduct.variant_id || 0,
        updatedAt: konimboProduct.updated_at || new Date().toISOString()
      }
    };
  }

  /**
   * Calculate discount percentage
   * @param {number} original
   * @param {number} current
   * @returns {number}
   */
  calculateDiscountPercent(original, current) {
    if (!original || original === current) return 0;
    return Math.round(((original - current) / original) * 100);
  }

  /**
   * Apply filters to products
   * @param {Array} products
   * @param {Object} filters
   * @returns {Array}
   */
  applyFilters(products, filters) {
    let filtered = [...products];

    // Price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      filtered = filtered.filter(p => {
        const price = parseFloat(p.price);
        return price >= min && price <= max;
      });
    }

    // In stock filter
    if (filters.inStock) {
      filtered = filtered.filter(p => p.visible && (p.quantity === null || p.quantity > 0));
    }

    // Manufacturer filter
    if (filters.manufacturers && filters.manufacturers.length > 0) {
      filtered = filtered.filter(p => {
        const manufacturer = p.attributes?.manufacturer || '';
        return filters.manufacturers.includes(manufacturer);
      });
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const title = (p.title || '').toLowerCase();
        const desc = (p.desc || '').toLowerCase();
        const code = (p.code || '').toLowerCase();
        return title.includes(query) || desc.includes(query) || code.includes(query);
      });
    }

    return filtered;
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
        return sorted.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

      case 'price_desc':
        return sorted.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

      case 'name_asc':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));

      case 'name_desc':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));

      case 'newest':
        return sorted.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

      default:
        return sorted;
    }
  }

  /**
   * Create configuration product
   * @param {Object} configuration
   * @returns {Promise<Object>}
   */
  async createConfigurationProduct(configuration) {
    try {
      log.debug('Creating configuration product', configuration);

      const configId = configuration.id || generateId('CONFIG-');
      const totalPrice = configuration.totalPrice;

      // Build component list for description
      const componentsList = configuration.selectedProducts.map(item => {
        return `- ${item.product.name} (${item.product.sku}) - ₪${item.product.price}`;
      }).join('\n');

      const productData = {
        title: `תצורת מחשב #${configId.split('-').pop()}`,
        code: configId,
        price: totalPrice,
        desc: `תצורת מחשב מותאמת אישית:\n\n${componentsList}\n\nסה"כ: ₪${totalPrice}`,
        category_id: 999, // Configuration category (must be created in Konimbo)
        visible: false,
        attributes: {
          type: 'pc-configuration',
          configId: configId,
          components: configuration.selectedProducts.map(item => ({
            productId: item.product.id,
            sku: item.product.sku,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            categoryId: item.categoryId
          })),
          createdAt: new Date().toISOString(),
          totalPrice: totalPrice,
          componentCount: configuration.selectedProducts.length
        }
      };

      // Note: Konimbo might not allow client-side product creation
      // This endpoint might need to be server-side
      const url = `${this.baseURL}/api/products`;

      const data = await this.request(url, {
        method: 'POST',
        body: JSON.stringify({ product: productData })
      });

      return data.product || data;

    } catch (error) {
      log.error('Error creating configuration product:', error);

      // Fallback: Add products individually to cart
      throw new Error('Cannot create configuration product. Please contact support.');
    }
  }

  /**
   * Add item to cart
   * @param {number} productId
   * @param {number} quantity
   * @param {Object} attributes
   * @returns {Promise<Object>}
   */
  async addToCart(productId, quantity = 1, attributes = {}) {
    try {
      log.debug('Adding to cart', { productId, quantity, attributes });

      const url = `${this.baseURL}${API_ENDPOINTS.CART_ADD}`;

      const data = await this.request(url, {
        method: 'POST',
        body: JSON.stringify({
          item_id: productId,
          quantity: quantity,
          attributes: attributes
        })
      });

      return data;

    } catch (error) {
      log.error('Error adding to cart:', error);
      throw error;
    }
  }

  /**
   * Add configuration to cart (adds all products)
   * @param {Object} configuration
   * @returns {Promise<void>}
   */
  async addConfigurationToCart(configuration) {
    try {
      log.debug('Adding configuration to cart', configuration);

      // Option 1: Try to create configuration product
      try {
        const configProduct = await this.createConfigurationProduct(configuration);
        await this.addToCart(configProduct.id, 1);
        return;
      } catch (error) {
        log.warn('Could not create configuration product, adding items individually', error);
      }

      // Option 2: Add all products individually
      for (const item of configuration.selectedProducts) {
        await this.addToCart(
          item.product.konimboData.productId,
          item.quantity,
          {
            configurationId: configuration.id,
            categoryName: item.categoryId
          }
        );
      }

      log.debug('Configuration added to cart successfully');

    } catch (error) {
      log.error('Error adding configuration to cart:', error);
      throw error;
    }
  }

  /**
   * Get current cart
   * @returns {Promise<Object>}
   */
  async getCart() {
    try {
      const url = `${this.baseURL}${API_ENDPOINTS.CART}`;
      const data = await this.request(url);
      return data.cart || data;
    } catch (error) {
      log.error('Error fetching cart:', error);
      throw error;
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    log.debug('API cache cleared');
  }

  /**
   * Clear specific cache entry
   * @param {string} key
   */
  clearCacheEntry(key) {
    this.cache.delete(key);
  }
}

// Export API client instance
export default KonimboAPI;

// Also export a singleton instance for easy use
export const konimboAPI = new KonimboAPI();
