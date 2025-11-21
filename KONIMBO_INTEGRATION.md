# Konimbo Integration Guide

Complete guide for integrating the PC Configurator with Konimbo e-commerce platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Konimbo Hybrid Setup](#konimbo-hybrid-setup)
3. [File Upload](#file-upload)
4. [Category Configuration](#category-configuration)
5. [API Integration](#api-integration)
6. [Product Data Structure](#product-data-structure)
7. [Cart Integration](#cart-integration)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Features](#advanced-features)

---

## Prerequisites

### Konimbo Account Requirements

- Active Konimbo store
- Admin access to Konimbo dashboard
- Konimbo Hybrid feature enabled (check with Konimbo support if needed)
- Product catalog with proper categories

### Technical Requirements

- Basic understanding of HTML/CSS/JavaScript
- Access to Konimbo file manager or external hosting
- Modern web browser for testing

---

## Konimbo Hybrid Setup

### What is Konimbo Hybrid?

Konimbo Hybrid is a feature that allows you to embed custom HTML, CSS, and JavaScript code into your store pages. It provides access to Konimbo's JavaScript API for interacting with products, cart, and customer data.

### Step 1: Access Konimbo Hybrid

1. Log in to your Konimbo admin panel
2. Navigate to: **עיצוב (Design) → הטמעת קודים (Code Embedding) → Konimbo Hybrid**
3. Click **+ הוסף עמוד חדש (Add New Page)** or edit an existing page

### Step 2: Create Configurator Page

1. **Page Name**: "בונה מחשבים" (PC Builder)
2. **URL Slug**: `configurator` or `pc-builder`
3. **Template**: Choose appropriate template (usually "Default Page")

### Step 3: Embed the Configurator

Add the following code to the Konimbo Hybrid editor:

```html
<!-- PC Configurator Integration -->
<div id="konimbo-configurator-root">
  <div id="configurator-loading">
    <p>טוען את בונה המחשבים...</p>
  </div>
</div>

<!-- Load Styles -->
<link rel="stylesheet" href="/files/configurator/styles/configurator.css">

<!-- Load Components -->
<script src="/files/configurator/components/shared/constants.js"></script>
<script src="/files/configurator/components/shared/utils.js"></script>
<script src="/files/configurator/components/shared/state-manager.js"></script>
<script src="/files/configurator/integration/konimbo-api.js"></script>
<script src="/files/configurator/components/category-selector/category-selector.js"></script>
<script src="/files/configurator/components/product-modal/product-modal.js"></script>
<script src="/files/configurator/components/basket-manager/basket-manager.js"></script>
<script src="/files/configurator/components/configurator-main/configurator-main.js"></script>

<!-- Initialize Configurator -->
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Initialize configurator
  const configurator = new PCConfigurator({
    rootElement: '#konimbo-configurator-root',
    configPath: '/files/configurator/config/categories.json',
    konimboStoreId: window.KonimboApp?.storeId || null,
    language: 'he',
    currency: 'ILS'
  });

  configurator.init();
});
</script>
```

---

## File Upload

### Option 1: Konimbo File Manager (Recommended)

1. Go to **ניהול (Management) → קבצים (Files)**
2. Create folder structure:
   ```
   /files/configurator/
   ├── components/
   ├── config/
   ├── integration/
   └── styles/
   ```
3. Upload all files maintaining the folder structure
4. Note the file URLs (usually: `https://yourdomain.com/files/...`)

### Option 2: External Hosting (CDN)

1. Upload files to your CDN/hosting
2. Update URLs in the Hybrid embed code:
   ```html
   <link rel="stylesheet" href="https://cdn.yourdomain.com/configurator/styles/configurator.css">
   ```

### File Upload Checklist

- [ ] `/components/configurator-main/configurator-main.js`
- [ ] `/components/configurator-main/configurator-main.html`
- [ ] `/components/category-selector/category-selector.js`
- [ ] `/components/category-selector/category-selector.html`
- [ ] `/components/product-modal/product-modal.js`
- [ ] `/components/product-modal/product-modal.html`
- [ ] `/components/basket-manager/basket-manager.js`
- [ ] `/components/basket-manager/basket-manager.html`
- [ ] `/components/shared/state-manager.js`
- [ ] `/components/shared/utils.js`
- [ ] `/components/shared/constants.js`
- [ ] `/integration/konimbo-api.js`
- [ ] `/styles/configurator.css`
- [ ] `/config/categories.json`

---

## Category Configuration

### Step 1: Identify Your Category IDs

1. Go to **מוצרים (Products) → קטגוריות (Categories)**
2. Click on each category you want to include
3. Note the ID from the URL: `.../categories/{ID}/edit`

### Step 2: Configure categories.json

Edit `/config/categories.json`:

```json
{
  "categories": [
    {
      "id": 95,
      "name": "Cases & Fans",
      "nameHebrew": "מארזים / מאוררים",
      "required": true,
      "order": 1,
      "icon": "🏠",
      "maxProducts": 1,
      "minProducts": 1
    },
    {
      "id": 64,
      "name": "Power Supplies",
      "nameHebrew": "ספקי כוח",
      "required": true,
      "order": 2,
      "icon": "⚡",
      "maxProducts": 1,
      "minProducts": 1
    },
    {
      "id": 17,
      "name": "Motherboards",
      "nameHebrew": "לוחות אם",
      "required": true,
      "order": 3,
      "icon": "🔧",
      "maxProducts": 1,
      "minProducts": 1
    },
    {
      "id": 32,
      "name": "Intel CPUs",
      "nameHebrew": "מעבדים INTEL",
      "required": true,
      "order": 4,
      "icon": "🖥️",
      "maxProducts": 1,
      "minProducts": 0,
      "mutuallyExclusive": [33]
    },
    {
      "id": 33,
      "name": "AMD CPUs",
      "nameHebrew": "מעבדים AMD",
      "required": true,
      "order": 5,
      "icon": "🖥️",
      "maxProducts": 1,
      "minProducts": 0,
      "mutuallyExclusive": [32]
    },
    {
      "id": 169,
      "name": "Memory (RAM)",
      "nameHebrew": "זכרון",
      "required": true,
      "order": 6,
      "icon": "💾",
      "maxProducts": 4,
      "minProducts": 1
    },
    {
      "id": 172,
      "name": "SSD",
      "nameHebrew": "SSD - Solid State Drive",
      "required": false,
      "order": 7,
      "icon": "💿",
      "maxProducts": 3,
      "minProducts": 0
    },
    {
      "id": 82,
      "name": "Graphics Cards",
      "nameHebrew": "כרטיסי מסך",
      "required": false,
      "order": 8,
      "icon": "🎮",
      "maxProducts": 1,
      "minProducts": 0
    }
  ]
}
```

---

## API Integration

### Konimbo JavaScript API

Konimbo provides a global `KonimboApp` object with useful properties and methods.

#### Available Properties

```javascript
// Store information
KonimboApp.storeId          // Your store ID
KonimboApp.storeName        // Store name
KonimboApp.currency         // Store currency (ILS, USD, etc.)

// Customer information (if logged in)
KonimboApp.customer         // Customer object
KonimboApp.customerId       // Customer ID

// Cart
KonimboApp.cart             // Current cart object
```

#### Fetching Products by Category

```javascript
// Using Konimbo's API
async function fetchCategoryProducts(categoryId) {
  try {
    const response = await fetch(`/categories/${categoryId}/products.json`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
}
```

#### Product Object Structure from Konimbo

```javascript
{
  "id": 12345,
  "title": "Intel Core i7-13700K",
  "code": "CPU-I7-13700K",  // SKU
  "price": 1599.90,
  "price_before_sale": 1799.90,
  "images": [
    {
      "url": "https://...",
      "alt": "Product image"
    }
  ],
  "desc": "Product description...",
  "visible": true,
  "quantity": 15,
  "second_code": "",
  "attributes": {
    // Custom attributes
  }
}
```

#### Adding to Cart

```javascript
async function addConfigurationToCart(configurationProduct) {
  try {
    // Method 1: Using Konimbo's cart API
    const response = await fetch('/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken() // If CSRF protection is enabled
      },
      body: JSON.stringify({
        item_id: configurationProduct.id,
        quantity: 1,
        attributes: configurationProduct.attributes
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add to cart');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}

// Method 2: Using Konimbo's JavaScript function (if available)
function addToCartKonimbo(productId) {
  if (typeof KonimboCart !== 'undefined') {
    KonimboCart.addItem(productId, 1);
  } else {
    // Fallback to form submission
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/cart/add';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'item_id';
    input.value = productId;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  }
}
```

---

## Product Data Structure

### Creating Configuration Product

When user completes configuration, create a special "configuration product" in Konimbo:

#### Step 1: Prepare Configuration Data

```javascript
function prepareConfigurationProduct(selectedProducts, configId) {
  const totalPrice = selectedProducts.reduce((sum, item) =>
    sum + (item.product.price * item.quantity), 0
  );

  const componentsList = selectedProducts.map(item =>
    `- ${item.product.title} (${item.product.code}) - ₪${item.product.price}`
  ).join('\n');

  return {
    title: `תצורת מחשב #${configId}`,
    code: `CONFIG-${configId}`,
    price: totalPrice,
    description: `תצורת מחשב מותאמת אישית:\n\n${componentsList}`,
    category_id: 999, // Your "Configurations" category
    visible: false,   // Hide from catalog
    attributes: {
      type: 'pc-configuration',
      configId: configId,
      components: selectedProducts.map(item => ({
        productId: item.product.id,
        sku: item.product.code,
        name: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
        categoryId: item.categoryId
      })),
      createdAt: new Date().toISOString()
    }
  };
}
```

#### Step 2: Create Product via API

```javascript
async function createConfigurationProduct(configData) {
  // Option 1: If Konimbo provides API for product creation
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}` // If required
    },
    body: JSON.stringify(configData)
  });

  return await response.json();
}

// Option 2: Use server-side endpoint (recommended)
async function createConfigurationViaServer(configData) {
  const response = await fetch('/api/create-configuration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(configData)
  });

  return await response.json();
}
```

### Important Notes

⚠️ **Product Creation Limitations**:
- Konimbo may not allow client-side product creation for security
- You may need to implement a server-side endpoint
- Contact Konimbo support for API access details

**Recommended Approach**:
1. Create a "Configurations" category in advance
2. Use server-side code to create products
3. Or manually create template products and update them

---

## Cart Integration

### Basic Cart Addition

```javascript
class CartIntegration {
  static async addConfiguration(configuration) {
    try {
      // Show loading state
      this.showLoading();

      // Create configuration product
      const configProduct = await this.createConfigProduct(configuration);

      // Add to cart
      await this.addToCart(configProduct.id);

      // Redirect to cart
      window.location.href = '/cart';
    } catch (error) {
      this.handleError(error);
    }
  }

  static async addToCart(productId) {
    // Use Konimbo's cart API or form submission
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/cart/add';

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'item_id';
    input.value = productId;

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  }

  static showLoading() {
    // Show loading overlay
  }

  static handleError(error) {
    alert('שגיאה בהוספה לסל. אנא נסה שוב.');
    console.error(error);
  }
}
```

### Cart Display with Configuration Details

```javascript
// On cart page, show configuration breakdown
function displayConfigurationInCart(cartItem) {
  if (cartItem.attributes?.type === 'pc-configuration') {
    const components = cartItem.attributes.components;

    const html = `
      <div class="configuration-details">
        <h4>פירוט תצורה:</h4>
        <ul>
          ${components.map(c => `
            <li>${c.name} - ₪${c.price}</li>
          `).join('')}
        </ul>
      </div>
    `;

    return html;
  }
}
```

---

## Testing

### Local Testing Checklist

1. **Category Loading**
   - [ ] All categories load correctly
   - [ ] Category names display in Hebrew
   - [ ] Category icons appear

2. **Product Selection**
   - [ ] Modal opens when clicking category
   - [ ] Products load from Konimbo
   - [ ] Product images display
   - [ ] Product prices show correctly

3. **Configuration Building**
   - [ ] Selected products appear in basket
   - [ ] Total price calculates correctly
   - [ ] Can remove products
   - [ ] Required categories validation works

4. **Cart Integration**
   - [ ] "Add to Cart" button works
   - [ ] Redirects to cart page
   - [ ] Configuration appears in cart
   - [ ] Total price matches

### Testing on Konimbo

1. **Preview Mode**
   - Use Konimbo's preview feature
   - Test with real product data

2. **Production Testing**
   - Test on live site (with care)
   - Use test orders
   - Verify order details in admin

---

## Troubleshooting

### Common Issues

#### 1. Products Not Loading

**Symptom**: Modal opens but no products appear

**Solutions**:
```javascript
// Check console for errors
console.log('Fetching category:', categoryId);

// Verify API endpoint
fetch(`/categories/${categoryId}/products.json`)
  .then(r => r.json())
  .then(data => console.log('Products:', data));

// Check category ID is correct
// Verify products exist in that category
```

#### 2. Scripts Not Loading

**Symptom**: "... is not defined" errors

**Solutions**:
- Check file paths in Konimbo Hybrid code
- Verify files uploaded correctly
- Check browser console for 404 errors
- Ensure scripts load in correct order

#### 3. Add to Cart Fails

**Symptom**: Error when adding to cart

**Solutions**:
```javascript
// Check cart API
console.log('KonimboApp:', window.KonimboApp);
console.log('Cart:', window.KonimboApp?.cart);

// Try direct form submission
// Check Konimbo documentation for cart API
```

#### 4. Prices Don't Match

**Symptom**: Total price incorrect

**Solutions**:
```javascript
// Debug price calculation
selectedProducts.forEach(item => {
  console.log(`${item.product.title}: ${item.product.price} x ${item.quantity}`);
});

// Check for VAT inclusion
// Verify number parsing (string vs number)
```

### Debug Mode

Enable debug logging:

```javascript
// Add to configurator initialization
const configurator = new PCConfigurator({
  // ... other options
  debug: true,
  logLevel: 'verbose'
});
```

---

## Advanced Features

### 1. Saved Configurations

```javascript
class ConfigurationStorage {
  static save(configuration) {
    const configs = this.getAll();
    configs.push({
      ...configuration,
      savedAt: new Date().toISOString()
    });
    localStorage.setItem('saved_configs', JSON.stringify(configs));
  }

  static getAll() {
    const data = localStorage.getItem('saved_configs');
    return data ? JSON.parse(data) : [];
  }

  static load(configId) {
    const configs = this.getAll();
    return configs.find(c => c.id === configId);
  }
}
```

### 2. Share Configuration

```javascript
function generateShareLink(configuration) {
  const data = btoa(JSON.stringify(configuration));
  return `${window.location.origin}/configurator?load=${data}`;
}

function loadFromShareLink() {
  const params = new URLSearchParams(window.location.search);
  const loadData = params.get('load');

  if (loadData) {
    try {
      const configuration = JSON.parse(atob(loadData));
      return configuration;
    } catch (e) {
      console.error('Invalid share link');
    }
  }

  return null;
}
```

### 3. Compatibility Checking

```javascript
function checkCompatibility(selectedProducts) {
  const warnings = [];

  // Example: Check CPU socket matches motherboard
  const cpu = selectedProducts.find(p => p.categoryId === 32 || p.categoryId === 33);
  const motherboard = selectedProducts.find(p => p.categoryId === 17);

  if (cpu && motherboard) {
    const cpuSocket = cpu.product.specifications?.socket;
    const mbSocket = motherboard.product.specifications?.socket;

    if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
      warnings.push({
        severity: 'error',
        message: `Socket mismatch: CPU (${cpuSocket}) incompatible with motherboard (${mbSocket})`
      });
    }
  }

  return warnings;
}
```

### 4. Customer Login Integration

```javascript
// Save configurations to customer account
async function saveToCustomerAccount(configuration) {
  if (!window.KonimboApp?.customer) {
    alert('Please log in to save configurations');
    return;
  }

  const response = await fetch('/api/customer/save-configuration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerId: KonimboApp.customer.id,
      configuration: configuration
    })
  });

  return await response.json();
}
```

---

## Best Practices

### 1. Performance
- Cache product data (5-10 minutes)
- Lazy load images
- Debounce search inputs
- Use virtual scrolling for long lists

### 2. User Experience
- Show loading states
- Provide clear error messages
- Auto-save progress
- Mobile-responsive design

### 3. Security
- Validate all inputs
- Sanitize HTML output
- Verify prices server-side
- Use HTTPS

### 4. Maintenance
- Log errors to tracking service
- Monitor performance
- Regular backups
- Version control

---

## Support Resources

### Konimbo Documentation
- [Konimbo API Docs](https://konimbo.co.il/api)
- [Konimbo Hybrid Guide](https://konimbo.freshdesk.com/support/solutions/articles/4000113339)

### Contact
- **Konimbo Support**: support@konimbo.co.il
- **Technical Issues**: Check GitHub issues
- **Feature Requests**: Submit via GitHub

---

**Last Updated**: 2025-11-21
**Version**: 1.0.0
