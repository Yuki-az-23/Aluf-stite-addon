# Architecture & Data Model Documentation

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Konimbo Platform                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Products   │  │     Cart     │  │   Customer   │      │
│  │   Database   │  │     API      │  │     Data     │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Konimbo API   │
                    │   Integration  │
                    └───────┬────────┘
                            │
    ┌───────────────────────┴───────────────────────┐
    │         PC Configurator Component              │
    │                                                │
    │  ┌──────────────────────────────────────┐    │
    │  │      State Manager (Singleton)        │    │
    │  │  - selectedProducts[]                 │    │
    │  │  - totalPrice                         │    │
    │  │  - categories[]                       │    │
    │  │  - currentConfiguration               │    │
    │  └─────────────┬────────────────────────┘    │
    │                │                              │
    │  ┌─────────────┼────────────────────────┐    │
    │  │             │                        │    │
    │  ▼             ▼             ▼          ▼    │
    │  Category    Product      Basket      Utils  │
    │  Selector    Modal        Manager            │
    │  Component   Component    Component          │
    └────────────────────────────────────────────────┘
                    │
                    ▼
            ┌───────────────┐
            │   User/DOM    │
            └───────────────┘
```

### Component Hierarchy

```
ConfiguratorMain (Root)
├── CategorySelector
│   ├── CategoryList
│   └── CategoryItem (repeatable)
│       └── SelectedProductBadge (conditional)
├── ProductModal
│   ├── ModalHeader
│   ├── ProductSearch
│   ├── ProductFilter
│   ├── ProductGrid
│   │   └── ProductCard (repeatable)
│   └── ModalFooter
└── BasketManager
    ├── BasketSummary
    ├── SelectedProductsList
    │   └── ProductListItem (repeatable)
    ├── PriceCalculator
    └── ActionButtons
        ├── SaveConfigButton
        ├── ClearConfigButton
        └── AddToCartButton
```

## Data Models

### 1. Category Model

```javascript
/**
 * Represents a product category in the configurator
 * @typedef {Object} Category
 */
const Category = {
  // Unique identifier (matches Konimbo category ID)
  id: Number,

  // Category name in English
  name: String,

  // Category name in Hebrew
  nameHebrew: String,

  // Display name (current locale)
  displayName: String,

  // Is this category required for a valid configuration?
  required: Boolean,

  // Display order (ascending)
  order: Number,

  // Icon class (optional)
  icon: String,

  // Maximum products allowed from this category
  maxProducts: Number, // default: 1

  // Minimum products required from this category
  minProducts: Number, // default: 0

  // Compatibility rules (optional)
  compatibilityRules: [{
    dependsOn: Number,      // Category ID this depends on
    condition: String,      // 'required' | 'incompatible' | 'recommended'
    message: String         // User-facing message
  }],

  // Konimbo API endpoint for products
  apiEndpoint: String,

  // Description (optional)
  description: String,

  // Is category enabled?
  enabled: Boolean
};

// Example
const cpuCategory = {
  id: 32,
  name: "Intel CPUs",
  nameHebrew: "מעבדים INTEL",
  displayName: "מעבדים INTEL",
  required: true,
  order: 4,
  icon: "fas fa-microchip",
  maxProducts: 1,
  minProducts: 1,
  compatibilityRules: [
    {
      dependsOn: 17, // Motherboard category
      condition: 'required',
      message: 'יש לבחור לוח אם תחילה'
    }
  ],
  apiEndpoint: '/api/categories/32/products',
  enabled: true
};
```

### 2. Product Model

```javascript
/**
 * Represents a product from Konimbo
 * @typedef {Object} Product
 */
const Product = {
  // Konimbo product ID
  id: Number,

  // Product SKU (unique)
  sku: String,

  // Product name
  name: String,

  // Product description
  description: String,

  // Price (in store currency)
  price: Number,

  // Original price (before discount)
  originalPrice: Number,

  // Currency code
  currency: String, // default: 'ILS'

  // Category ID
  categoryId: Number,

  // Category name
  categoryName: String,

  // Product images
  images: [{
    url: String,
    alt: String,
    isPrimary: Boolean
  }],

  // Primary image URL (convenience)
  primaryImage: String,

  // Stock status
  inStock: Boolean,

  // Available quantity
  stockQuantity: Number,

  // Product specifications/attributes
  specifications: {
    manufacturer: String,
    model: String,
    // Dynamic fields based on category
    [key: String]: any
  },

  // Product URL on store
  url: String,

  // Is product on sale?
  onSale: Boolean,

  // Discount percentage
  discountPercent: Number,

  // Product weight (for shipping)
  weight: Number,

  // Product tags/labels
  tags: [String],

  // Konimbo metadata
  konimboData: {
    productId: Number,
    variantId: Number,
    updatedAt: String
  }
};

// Example
const product = {
  id: 12345,
  sku: "CPU-I7-13700K",
  name: "Intel Core i7-13700K",
  description: "16 cores, 24 threads, up to 5.4GHz",
  price: 1599.90,
  originalPrice: 1799.90,
  currency: "ILS",
  categoryId: 32,
  categoryName: "Intel CPUs",
  images: [
    {
      url: "https://example.com/i7.jpg",
      alt: "Intel Core i7-13700K",
      isPrimary: true
    }
  ],
  primaryImage: "https://example.com/i7.jpg",
  inStock: true,
  stockQuantity: 15,
  specifications: {
    manufacturer: "Intel",
    model: "i7-13700K",
    cores: 16,
    threads: 24,
    baseClock: "3.4 GHz",
    boostClock: "5.4 GHz",
    socket: "LGA 1700",
    tdp: "125W"
  },
  url: "https://store.com/products/i7-13700k",
  onSale: true,
  discountPercent: 11,
  weight: 0.5,
  tags: ["Intel", "Gaming", "High-End"],
  konimboData: {
    productId: 12345,
    variantId: 0,
    updatedAt: "2025-11-21T10:00:00Z"
  }
};
```

### 3. Selected Product Model

```javascript
/**
 * Represents a product selected in the configuration
 * @typedef {Object} SelectedProduct
 */
const SelectedProduct = {
  // Reference to original product
  product: Product,

  // Category this product belongs to
  categoryId: Number,

  // Quantity selected
  quantity: Number,

  // Line total (price * quantity)
  lineTotal: Number,

  // When was this added to configuration
  addedAt: Date,

  // Optional notes/customization
  notes: String,

  // Is this product valid in current configuration?
  isValid: Boolean,

  // Validation warnings/errors
  validationMessages: [String]
};
```

### 4. Configuration Model

```javascript
/**
 * Represents a complete PC configuration
 * @typedef {Object} Configuration
 */
const Configuration = {
  // Unique configuration ID
  id: String, // e.g., "CONFIG-20231121-ABC123"

  // All selected products
  selectedProducts: [SelectedProduct],

  // Total price (sum of all products)
  totalPrice: Number,

  // Total before discounts
  subtotal: Number,

  // Total discount amount
  totalDiscount: Number,

  // Configuration metadata
  metadata: {
    createdAt: Date,
    updatedAt: Date,
    customerId: Number,
    customerName: String,
    configurationName: String
  },

  // Is configuration valid?
  isValid: Boolean,

  // Validation results
  validation: {
    missingRequired: [Number], // Category IDs
    compatibilityIssues: [{
      product1: Number,
      product2: Number,
      message: String
    }],
    warnings: [String]
  },

  // Configuration state
  state: String, // 'draft' | 'complete' | 'saved' | 'ordered'

  // Share/load token (optional)
  shareToken: String
};
```

### 5. State Model (Global Application State)

```javascript
/**
 * Global application state
 * @typedef {Object} AppState
 */
const AppState = {
  // Current configuration
  currentConfiguration: Configuration,

  // All available categories
  categories: [Category],

  // Currently opened category (in modal)
  currentCategory: Category | null,

  // Products for current category
  currentCategoryProducts: [Product],

  // Loading states
  loading: {
    categories: Boolean,
    products: Boolean,
    addingToCart: Boolean
  },

  // UI state
  ui: {
    isModalOpen: Boolean,
    modalType: String, // 'product' | 'saved-configs' | 'share'
    searchQuery: String,
    filters: {
      priceRange: [Number, Number],
      manufacturers: [String],
      inStock: Boolean
    },
    sortBy: String // 'price-asc' | 'price-desc' | 'name' | 'popularity'
  },

  // User preferences
  preferences: {
    language: String, // 'he' | 'en'
    currency: String,
    showPricesWithVAT: Boolean
  },

  // Error state
  error: {
    hasError: Boolean,
    message: String,
    code: String
  },

  // Saved configurations (loaded from localStorage)
  savedConfigurations: [Configuration]
};
```

## Data Flow Patterns

### 1. User Selects a Category

```
User clicks category
    ↓
CategorySelector fires 'category-selected' event
    ↓
State Manager updates currentCategory
    ↓
State Manager loads products for category (API call)
    ↓
ProductModal receives state update
    ↓
ProductModal renders products
```

### 2. User Selects a Product

```
User clicks product in modal
    ↓
ProductModal fires 'product-selected' event
    ↓
State Manager adds product to selectedProducts[]
    ↓
State Manager recalculates totalPrice
    ↓
State Manager validates configuration
    ↓
All components receive state update
    ↓
CategorySelector shows selected badge
BasketManager updates summary
ProductModal closes
```

### 3. User Adds Configuration to Cart

```
User clicks "Add to Cart"
    ↓
BasketManager validates configuration
    ↓
State Manager creates unique product
    ↓
Konimbo API integration sends request
    ↓
    ├─ Success
    │   ↓
    │   Redirect to cart
    │   Clear configuration
    │
    └─ Error
        ↓
        Show error message
        Keep configuration
```

## State Management Strategy

### Singleton State Manager

```javascript
class StateManager {
  constructor() {
    if (StateManager.instance) {
      return StateManager.instance;
    }

    this.state = this.getInitialState();
    this.subscribers = [];

    StateManager.instance = this;
  }

  // Get current state
  getState() {
    return { ...this.state };
  }

  // Update state
  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notifySubscribers();
  }

  // Subscribe to state changes
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Notify all subscribers
  notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.state));
  }
}
```

### Event System

```javascript
// Custom events for component communication
const Events = {
  CATEGORY_SELECTED: 'configurator:category-selected',
  PRODUCT_SELECTED: 'configurator:product-selected',
  PRODUCT_REMOVED: 'configurator:product-removed',
  CONFIGURATION_CLEARED: 'configurator:configuration-cleared',
  ADD_TO_CART: 'configurator:add-to-cart',
  STATE_CHANGED: 'configurator:state-changed'
};
```

## API Integration Architecture

### Konimbo API Wrapper

```javascript
class KonimboAPI {
  // Get products by category
  async getProductsByCategory(categoryId, options = {}) {
    const { page = 1, perPage = 50, filters = {} } = options;
    // Implementation
  }

  // Get single product
  async getProduct(productId) {
    // Implementation
  }

  // Create custom configuration product
  async createConfigurationProduct(configuration) {
    // Implementation
  }

  // Add to cart
  async addToCart(productId, quantity) {
    // Implementation
  }

  // Get categories
  async getCategories() {
    // Implementation
  }
}
```

### Caching Strategy

```javascript
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

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }
}
```

## Database Schema (Konimbo)

### Categories Table Structure

```sql
-- Konimbo manages this internally
-- We only reference category IDs
categories:
  - id (PK)
  - name
  - parent_id
  - order
  - enabled
```

### Products Table Structure

```sql
-- Konimbo manages this internally
products:
  - id (PK)
  - title
  - description
  - price
  - category_id (FK)
  - sku
  - stock_quantity
  - images (JSON)
  - attributes (JSON)
```

### Configuration Product (Custom)

```javascript
// When we create a configuration product in Konimbo:
{
  title: "PC Configuration #ABC123",
  sku: "CONFIG-20231121-ABC123",
  price: 15999.00, // Total of all components
  description: `
    Configured PC includes:
    - Intel Core i7-13700K
    - ASUS ROG Strix Z790
    - 32GB DDR5 RAM
    ...
  `,
  category_id: 999, // Special "Configurations" category
  attributes: {
    configurationType: "PC",
    components: [
      { categoryId: 32, productId: 12345, sku: "CPU-I7-13700K", quantity: 1 },
      { categoryId: 17, productId: 67890, sku: "MB-ASUS-Z790", quantity: 1 },
      ...
    ],
    configurationData: {
      createdAt: "2025-11-21T10:00:00Z",
      totalPrice: 15999.00,
      componentCount: 12
    }
  }
}
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Load product images only when visible
2. **Debouncing**: Debounce search input (300ms)
3. **Throttling**: Throttle scroll events (100ms)
4. **Memoization**: Cache computed values (total price, etc.)
5. **Virtual Scrolling**: For large product lists (100+ items)
6. **Code Splitting**: Load components on demand

### Memory Management

```javascript
// Clean up when component unmounts
class Component {
  destroy() {
    // Remove event listeners
    this.removeEventListeners();

    // Unsubscribe from state
    this.unsubscribe();

    // Clear references
    this.element = null;
    this.data = null;
  }
}
```

## Security Architecture

### Input Sanitization

```javascript
function sanitizeInput(input) {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 200);
}
```

### XSS Prevention

```javascript
// Always use textContent, never innerHTML with user input
element.textContent = userInput;

// If HTML is needed, sanitize first
element.innerHTML = DOMPurify.sanitize(trustedHTML);
```

### Price Validation

```javascript
// Client-side calculation
const clientTotal = calculateTotal(selectedProducts);

// Server-side verification (in Konimbo)
// Server recalculates price before adding to cart
// Never trust client-sent prices
```

## Error Handling Architecture

### Error Types

```javascript
class ConfiguratorError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
  }
}

// Error codes
const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  COMPATIBILITY_ERROR: 'COMPATIBILITY_ERROR',
  OUT_OF_STOCK: 'OUT_OF_STOCK'
};
```

### Error Recovery

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

## Testing Strategy

### Unit Tests
- State management functions
- Utility functions
- Price calculations
- Validation logic

### Integration Tests
- Component interactions
- API calls
- State updates

### E2E Tests
- Complete configuration flow
- Add to cart
- Error scenarios

---

This architecture is designed for:
- **Scalability**: Easy to add new categories/features
- **Maintainability**: Clear separation of concerns
- **Performance**: Optimized for large product catalogs
- **Reliability**: Robust error handling and validation
- **Security**: Protected against common vulnerabilities
