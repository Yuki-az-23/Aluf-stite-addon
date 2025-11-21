/**
 * Constants for PC Configurator
 * @file constants.js
 * @description Application-wide constants and configuration
 */

// Event names for component communication
export const EVENTS = {
  // Category events
  CATEGORY_SELECTED: 'configurator:category-selected',
  CATEGORY_LOADED: 'configurator:category-loaded',

  // Product events
  PRODUCT_SELECTED: 'configurator:product-selected',
  PRODUCT_REMOVED: 'configurator:product-removed',
  PRODUCTS_LOADED: 'configurator:products-loaded',

  // Configuration events
  CONFIGURATION_UPDATED: 'configurator:configuration-updated',
  CONFIGURATION_CLEARED: 'configurator:configuration-cleared',
  CONFIGURATION_SAVED: 'configurator:configuration-saved',
  CONFIGURATION_LOADED: 'configurator:configuration-loaded',

  // Cart events
  ADD_TO_CART: 'configurator:add-to-cart',
  ADD_TO_CART_SUCCESS: 'configurator:add-to-cart-success',
  ADD_TO_CART_ERROR: 'configurator:add-to-cart-error',

  // UI events
  MODAL_OPEN: 'configurator:modal-open',
  MODAL_CLOSE: 'configurator:modal-close',
  LOADING_START: 'configurator:loading-start',
  LOADING_END: 'configurator:loading-end',
  ERROR: 'configurator:error',

  // State events
  STATE_CHANGED: 'configurator:state-changed'
};

// Configuration settings
export const CONFIG = {
  // Product loading
  PRODUCTS_PER_PAGE: 50,
  MAX_PRODUCTS_PER_CATEGORY: 5,

  // Auto-save
  AUTO_SAVE: true,
  SAVE_INTERVAL: 30000, // 30 seconds

  // Cache
  CACHE_ENABLED: true,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes

  // Features
  SHOW_COMPATIBILITY_WARNINGS: true,
  ALLOW_SAVE_CONFIGURATIONS: true,
  ALLOW_SHARE_CONFIGURATIONS: true,

  // UI
  MODAL_ANIMATION_DURATION: 300, // ms
  DEBOUNCE_DELAY: 300, // ms for search input
  THROTTLE_DELAY: 100, // ms for scroll events

  // Validation
  MIN_PRICE: 0,
  MAX_PRICE: 999999,
  MIN_QUANTITY: 1,
  MAX_QUANTITY: 10,

  // Currency
  DEFAULT_CURRENCY: 'ILS',
  CURRENCY_SYMBOL: '₪',
  SHOW_PRICES_WITH_VAT: true,
  VAT_RATE: 0.17, // 17% VAT

  // Language
  DEFAULT_LANGUAGE: 'he',
  RTL_LANGUAGES: ['he', 'ar'],

  // Storage
  STORAGE_PREFIX: 'konimbo_configurator_',
  STORAGE_KEYS: {
    CURRENT_CONFIG: 'current_config',
    SAVED_CONFIGS: 'saved_configs',
    PREFERENCES: 'preferences'
  }
};

// Error codes
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // API errors
  API_ERROR: 'API_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED: 'MISSING_REQUIRED',
  INVALID_QUANTITY: 'INVALID_QUANTITY',

  // Compatibility errors
  COMPATIBILITY_ERROR: 'COMPATIBILITY_ERROR',
  INCOMPATIBLE_PRODUCTS: 'INCOMPATIBLE_PRODUCTS',

  // Stock errors
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',

  // Cart errors
  CART_ERROR: 'CART_ERROR',
  ADD_TO_CART_FAILED: 'ADD_TO_CART_FAILED',

  // General
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// Error messages (Hebrew)
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]: 'שגיאת רשת. אנא בדוק את החיבור לאינטרנט.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'תם הזמן המוקצב. אנא נסה שוב.',
  [ERROR_CODES.API_ERROR]: 'שגיאה בטעינת נתונים. אנא נסה שוב.',
  [ERROR_CODES.NOT_FOUND]: 'המוצר לא נמצא.',
  [ERROR_CODES.VALIDATION_ERROR]: 'נתונים לא תקינים.',
  [ERROR_CODES.MISSING_REQUIRED]: 'חסרים רכיבים נדרשים.',
  [ERROR_CODES.OUT_OF_STOCK]: 'המוצר אזל מהמלאי.',
  [ERROR_CODES.CART_ERROR]: 'שגיאה בהוספה לסל.',
  [ERROR_CODES.UNKNOWN_ERROR]: 'אירעה שגיאה. אנא נסה שוב.'
};

// Validation messages (Hebrew)
export const VALIDATION_MESSAGES = {
  MISSING_REQUIRED_CATEGORY: 'חסר רכיב נדרש: {category}',
  MISSING_CPU: 'יש לבחור מעבד (Intel או AMD)',
  MISSING_COOLING: 'יש לבחור פתרון קירור למעבד',
  MISSING_STORAGE: 'יש לבחור לפחות אמצעי אחסון אחד',
  INCOMPATIBLE_SOCKET: 'Socket המעבד לא תואם ללוח האם',
  INSUFFICIENT_POWER: 'ספק הכוח אינו מספיק למערכת',
  INVALID_QUANTITY: 'כמות לא תקינה',
  MAX_PRODUCTS_EXCEEDED: 'עברת את מספר המוצרים המקסימלי עבור קטגוריה זו'
};

// CSS class names
export const CSS_CLASSES = {
  // Components
  CONFIGURATOR_ROOT: 'pc-configurator',
  CATEGORY_SELECTOR: 'category-selector',
  PRODUCT_MODAL: 'product-modal',
  BASKET_MANAGER: 'basket-manager',

  // States
  LOADING: 'is-loading',
  DISABLED: 'is-disabled',
  ACTIVE: 'is-active',
  SELECTED: 'is-selected',
  ERROR: 'has-error',
  EMPTY: 'is-empty',
  HIDDEN: 'is-hidden',
  VISIBLE: 'is-visible',

  // Modal
  MODAL_OPEN: 'modal-open',
  MODAL_BACKDROP: 'modal-backdrop',

  // Product states
  IN_STOCK: 'in-stock',
  OUT_OF_STOCK: 'out-of-stock',
  ON_SALE: 'on-sale',

  // Validation
  REQUIRED: 'required',
  OPTIONAL: 'optional',
  INVALID: 'invalid',
  VALID: 'valid'
};

// API endpoints (relative to Konimbo store)
export const API_ENDPOINTS = {
  CATEGORIES: '/categories.json',
  CATEGORY_PRODUCTS: '/categories/{id}/products.json',
  PRODUCT: '/products/{id}.json',
  CART_ADD: '/cart/add',
  CART_UPDATE: '/cart/update',
  CART_REMOVE: '/cart/remove',
  CART: '/cart.json'
};

// Local storage keys
export const STORAGE_KEYS = {
  CURRENT_CONFIG: `${CONFIG.STORAGE_PREFIX}current_config`,
  SAVED_CONFIGS: `${CONFIG.STORAGE_PREFIX}saved_configs`,
  PREFERENCES: `${CONFIG.STORAGE_PREFIX}preferences`,
  CACHE: `${CONFIG.STORAGE_PREFIX}cache`
};

// Sort options
export const SORT_OPTIONS = {
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  POPULARITY: 'popularity',
  NEWEST: 'newest'
};

// Sort labels (Hebrew)
export const SORT_LABELS = {
  [SORT_OPTIONS.PRICE_ASC]: 'מחיר: נמוך לגבוה',
  [SORT_OPTIONS.PRICE_DESC]: 'מחיר: גבוה לנמוך',
  [SORT_OPTIONS.NAME_ASC]: 'שם: א-ת',
  [SORT_OPTIONS.NAME_DESC]: 'שם: ת-א',
  [SORT_OPTIONS.POPULARITY]: 'פופולריים',
  [SORT_OPTIONS.NEWEST]: 'חדשים ביותר'
};

// Configuration states
export const CONFIG_STATES = {
  DRAFT: 'draft',
  COMPLETE: 'complete',
  SAVED: 'saved',
  ORDERED: 'ordered'
};

// Product compatibility fields
export const COMPATIBILITY_FIELDS = {
  CPU_SOCKET: 'socket',
  MEMORY_TYPE: 'memoryType',
  MEMORY_SPEED: 'memorySpeed',
  FORM_FACTOR: 'formFactor',
  CHIPSET: 'chipset',
  INTERFACE: 'interface',
  POWER_REQUIREMENT: 'powerRequirement'
};

// Default configuration
export const DEFAULT_CONFIG = {
  id: null,
  selectedProducts: [],
  totalPrice: 0,
  subtotal: 0,
  totalDiscount: 0,
  metadata: {
    createdAt: null,
    updatedAt: null,
    configurationName: 'תצורה חדשה'
  },
  isValid: false,
  validation: {
    missingRequired: [],
    compatibilityIssues: [],
    warnings: []
  },
  state: CONFIG_STATES.DRAFT
};

// Animation durations (ms)
export const ANIMATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
};

// Breakpoints (for responsive design)
export const BREAKPOINTS = {
  MOBILE: 576,
  TABLET: 768,
  DESKTOP: 992,
  WIDE: 1200
};

// Z-index layers
export const Z_INDEX = {
  BASE: 1,
  DROPDOWN: 100,
  STICKY: 200,
  FIXED: 300,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500
};

// Regex patterns
export const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\d\-\+\(\)\s]+$/,
  NUMBER: /^\d+$/,
  DECIMAL: /^\d+(\.\d{1,2})?$/,
  SKU: /^[A-Z0-9\-]+$/i
};

// Icons (emoji or can be replaced with icon class names)
export const ICONS = {
  CASE: '🏠',
  PSU: '⚡',
  MOTHERBOARD: '🔧',
  CPU: '💻',
  COOLING: '❄️',
  RAM: '💾',
  SSD: '💿',
  HDD: '💽',
  GPU: '🎮',
  OPTICAL: '📀',
  SOFTWARE: '💿',
  SERVICE: '🔧',

  // UI icons
  CLOSE: '✕',
  CHECK: '✓',
  WARNING: '⚠️',
  ERROR: '❌',
  INFO: 'ℹ️',
  CART: '🛒',
  TRASH: '🗑️',
  EDIT: '✏️',
  SAVE: '💾',
  SHARE: '📤',
  SEARCH: '🔍'
};

// Development mode
export const IS_DEV = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';

// Debug mode
export const DEBUG = IS_DEV || localStorage.getItem('configurator_debug') === 'true';

// Freeze objects to prevent modifications
Object.freeze(EVENTS);
Object.freeze(CONFIG);
Object.freeze(ERROR_CODES);
Object.freeze(ERROR_MESSAGES);
Object.freeze(VALIDATION_MESSAGES);
Object.freeze(CSS_CLASSES);
Object.freeze(API_ENDPOINTS);
Object.freeze(SORT_OPTIONS);
Object.freeze(SORT_LABELS);
Object.freeze(CONFIG_STATES);
Object.freeze(COMPATIBILITY_FIELDS);
Object.freeze(ANIMATIONS);
Object.freeze(BREAKPOINTS);
Object.freeze(Z_INDEX);
Object.freeze(HTTP_STATUS);
Object.freeze(PATTERNS);
Object.freeze(ICONS);
