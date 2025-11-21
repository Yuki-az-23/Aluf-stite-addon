# Konimbo PC Configurator Component

A modular, customizable PC configurator component designed for integration with Konimbo e-commerce platform. This component allows customers to build custom PC configurations by selecting components from various categories.

## Overview

This configurator enables customers to:
- Select PC components from multiple categories (CPU, GPU, RAM, etc.)
- View selected components in real-time
- See total price calculation
- Add complete configuration as a single product to cart
- Get compatibility warnings (optional feature)

## Project Structure

```
/
├── README.md                          # Main documentation (this file)
├── ARCHITECTURE.md                    # Architecture and data model documentation
├── KONIMBO_INTEGRATION.md            # Konimbo integration guide
├── components/
│   ├── configurator-main/            # Main configurator container
│   │   ├── configurator-main.html    # Main HTML structure
│   │   └── configurator-main.js      # Main component logic
│   ├── category-selector/            # Category selection component
│   │   ├── category-selector.html    # Category list HTML
│   │   └── category-selector.js      # Category logic
│   ├── product-modal/                # Product selection modal
│   │   ├── product-modal.html        # Modal HTML structure
│   │   └── product-modal.js          # Modal logic
│   ├── basket-manager/               # Configuration basket component
│   │   ├── basket-manager.html       # Basket display HTML
│   │   └── basket-manager.js         # Basket management logic
│   └── shared/                       # Shared utilities
│       ├── state-manager.js          # Global state management
│       ├── utils.js                  # Helper functions
│       └── constants.js              # Constants and enums
├── config/
│   └── categories.json               # Category configuration
├── styles/
│   └── configurator.css              # All component styles
└── integration/
    └── konimbo-api.js                # Konimbo API integration layer

```

## Features

### Core Features
- **Category-based Selection**: Organized component categories (Cases, PSU, Motherboard, etc.)
- **Product Search & Filter**: Search and filter products within each category
- **Real-time Price Calculation**: Dynamic total price updates
- **Configuration Summary**: Visual summary of selected components
- **Responsive Design**: Mobile-friendly interface
- **RTL Support**: Full Hebrew/RTL language support

### Advanced Features (Optional)
- **Compatibility Checking**: Validate component compatibility
- **Saved Configurations**: Save and load configurations
- **Share Configurations**: Generate shareable links
- **Price Comparison**: Compare similar components

## Technology Stack

- **Vanilla JavaScript (ES6+)**: No framework dependencies
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with flexbox/grid
- **Konimbo API**: Platform integration
- **LocalStorage**: Client-side state persistence

## Quick Start

### 1. Upload Files to Konimbo

Upload all files to your Konimbo store's file manager or host them externally.

### 2. Add to Konimbo Hybrid Area

In your Konimbo admin panel:
1. Go to **Design → Code Embedding → Konimbo Hybrid**
2. Create a new page or edit existing page
3. Add the configurator code (see KONIMBO_INTEGRATION.md)

### 3. Configure Categories

Edit `config/categories.json` to match your store's product categories:

```json
{
  "categories": [
    {
      "id": 95,
      "name": "Cases & Cooling",
      "nameHebrew": "מארזים ומאוררים",
      "required": true,
      "order": 1
    }
  ]
}
```

### 4. Test the Configurator

Visit your configurator page and test:
- Category selection
- Product selection from modals
- Price calculation
- Add to cart functionality

## Component Architecture

### State Management

The configurator uses a centralized state manager that maintains:
```javascript
{
  selectedProducts: [],      // Array of selected products
  totalPrice: 0,             // Total configuration price
  categories: [],            // Available categories
  currentCategory: null,     // Currently viewing category
  isLoading: false          // Loading state
}
```

### Data Flow

1. **User clicks category** → Opens product modal
2. **User selects product** → Updates state
3. **State changes** → Triggers UI update
4. **User clicks "Add to Cart"** → Creates unique product in Konimbo

### Component Communication

Components communicate through:
- **Custom Events**: For component interactions
- **State Manager**: For shared state
- **Event Bus**: For loosely coupled communication

## Konimbo Integration

### Product Data Structure

Each selected product must include:
```javascript
{
  id: 12345,              // Konimbo product ID
  sku: "CPU-I7-13700K",   // Product SKU
  name: "Intel Core i7",  // Product name
  price: 1599,            // Price in store currency
  categoryId: 32,         // Category ID
  categoryName: "CPUs",   // Category name
  image: "url/to/image",  // Product image
  quantity: 1             // Quantity
}
```

### Creating Configuration Product

When user clicks "Add to Cart", the system:
1. Collects all selected products
2. Generates unique SKU (e.g., `CONFIG-20231121-ABC123`)
3. Creates combined product with all components
4. Adds to Konimbo cart via API

See `KONIMBO_INTEGRATION.md` for detailed API usage.

## Customization

### Styling

Modify `styles/configurator.css` to match your store theme:
```css
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --danger-color: #dc3545;
}
```

### Categories

Edit `config/categories.json` to add/remove categories:
```json
{
  "id": 999,
  "name": "New Category",
  "nameHebrew": "קטגוריה חדשה",
  "required": false,
  "order": 99,
  "compatibilityRules": []
}
```

### Behavior

Modify JavaScript files in `components/shared/constants.js`:
```javascript
export const CONFIG = {
  MAX_PRODUCTS_PER_CATEGORY: 5,
  AUTO_SAVE: true,
  SAVE_INTERVAL: 30000, // 30 seconds
  SHOW_COMPATIBILITY_WARNINGS: true
};
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Development

### Local Development

1. Clone repository
2. Open `components/configurator-main/configurator-main.html` in browser
3. Use browser dev tools for testing

### Testing with Konimbo

1. Upload files to Konimbo file manager
2. Use Konimbo's preview mode
3. Test with actual product data

## Troubleshooting

### Products Not Loading
- Check category IDs in `config/categories.json`
- Verify Konimbo API credentials
- Check browser console for errors

### Price Calculation Wrong
- Verify product prices in Konimbo admin
- Check currency settings
- Review `basket-manager.js` calculation logic

### Modal Not Opening
- Check for JavaScript errors
- Verify modal HTML is loaded
- Check z-index in CSS

## Security Considerations

- **Input Validation**: All user inputs are sanitized
- **XSS Prevention**: Using textContent instead of innerHTML
- **CSRF Protection**: Using Konimbo's built-in tokens
- **Price Verification**: Server-side price validation required

## Performance Optimization

- **Lazy Loading**: Products loaded on-demand
- **Debouncing**: Search inputs debounced
- **Caching**: Product data cached in memory
- **Minification**: Minify JS/CSS for production

## Future Enhancements

- [ ] AI-powered compatibility checking
- [ ] Video reviews integration
- [ ] Benchmark comparisons
- [ ] Price history tracking
- [ ] Community configurations
- [ ] Expert recommendations

## Support

For issues and questions:
1. Check documentation in `docs/` folder
2. Review `KONIMBO_INTEGRATION.md` for API issues
3. Contact Konimbo support for platform-specific questions

## License

[Your License Here]

## Credits

Built for Konimbo platform integration based on Morlevi.co.il configurator design.

---

**Version**: 1.0.0
**Last Updated**: 2025-11-21
**Compatibility**: Konimbo Hybrid Platform
