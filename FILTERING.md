# Product Filtering System

Complete guide to the proactive product filtering system in the Konimbo PC Configurator.

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Filter Types](#filter-types)
4. [Compatibility Filtering](#compatibility-filtering)
5. [Specification Filtering](#specification-filtering)
6. [UI Components](#ui-components)
7. [Customization](#customization)
8. [Examples](#examples)

---

## Overview

The filtering system provides **proactive filtering** of products based on:

1. **Compatibility with Current Configuration**: Automatically hides incompatible products
2. **Product Specifications**: Filters by manufacturer, memory type, socket, etc.

### Key Features

- ✅ **Proactive Filtering**: Show only compatible products before selection
- ✅ **Automatic Compatibility Checking**: Uses compatibility rules to filter products
- ✅ **Dynamic Filter UI**: Filters generated automatically based on available products
- ✅ **Category-Specific Filters**: Different filters for different product categories
- ✅ **Multi-Select Filters**: Select multiple values within each filter group
- ✅ **Show More/Less**: Collapsible filter options for long lists

---

## How It Works

### Architecture

```
User Opens Category Modal
        ↓
Products Loaded & Specs Parsed
        ↓
Filter UI Built from Available Products
        ↓
Compatibility Filter Applied (if enabled)
        ↓
Specification Filters Applied
        ↓
Filtered Products Displayed
```

### Components

1. **CompatibilityChecker** (`components/shared/compatibility-checker.js`)
   - `isProductCompatible()`: Checks if a single product is compatible with current configuration
   - Used to filter products proactively

2. **SpecParser** (`components/shared/spec-parser.js`)
   - Extracts specifications from product data
   - Parses name, description, tags
   - Normalizes values for consistent matching

3. **ProductModal** (`components/product-modal/product-modal.js`)
   - Builds filter UI dynamically
   - Applies compatibility and specification filters
   - Updates product display in real-time

---

## Filter Types

### 1. Compatibility Filter

**Checkbox**: "רכיבים תואמים בלבד" (Compatible Components Only)

- **Default**: Enabled
- **Behavior**: Hides products that would create compatibility errors
- **Logic**: Tests each product with current configuration using `isProductCompatible()`

**Example**:
- Intel CPU selected (Socket LGA 1700)
- Motherboard modal shows only LGA 1700 motherboards
- AMD motherboards automatically hidden

### 2. Stock Filter

**Checkbox**: "במלאי בלבד" (In Stock Only)

- Shows only products currently in stock
- Applies after compatibility filter

### 3. Specification Filters

**Dynamic Filters** based on product category:

- **Manufacturer** (יצרן): Filter by brand
- **Socket**: Filter by CPU/motherboard socket
- **Memory Type** (סוג זיכרון): DDR5, DDR4, DDR3
- **Form Factor** (גודל לוח): ATX, Micro-ATX, Mini-ITX
- **TDP** (W): Power consumption
- **Wattage** (הספק): PSU power output
- And more...

---

## Compatibility Filtering

### How Compatibility Checking Works

When compatibility filter is enabled:

1. Get current configuration state
2. For each product in the list:
   - Create temporary configuration with product added
   - Run compatibility rules check
   - If no **errors** found, show product
   - If errors found, hide product

### Example: CPU + Motherboard

```javascript
// Current config: Intel Core i7-13700K (Socket LGA 1700)
// User opens Motherboard category

// For each motherboard:
compatibilityChecker.isProductCompatible(
  motherboard,
  17, // Motherboard category
  currentConfiguration,
  categories
);

// Only motherboards with Socket LGA 1700 return true
// AMD AM5 motherboards return false → hidden
```

### Supported Compatibility Checks

All compatibility rules from `compatibility-rules.json` are checked:

- ✅ Socket matching (CPU ↔ Motherboard)
- ✅ RAM type/speed compatibility
- ✅ Form factor support (Motherboard ↔ Case)
- ✅ Physical dimensions (GPU length, cooler height)
- ✅ Power requirements
- ✅ Interface availability (M.2 slots, SATA ports)
- ✅ Cooler socket support

---

## Specification Filtering

### Filter Generation

Filters are built dynamically from available products:

```javascript
// Extract unique values from products
const filterData = {
  manufacturer: ['Intel', 'AMD', 'Corsair', 'G.Skill'],
  socket: ['LGA 1700', 'LGA 1200', 'AM5', 'AM4'],
  memoryType: ['DDR5', 'DDR4']
};
```

### Category-Specific Filters

Different categories show different filters:

#### CPUs (Intel/AMD)
- Socket
- TDP

#### Motherboards
- Socket
- Form Factor
- Memory Type
- Max Memory Speed

#### RAM
- Memory Type
- Memory Speed

#### PSU
- Wattage

#### CPU Coolers
- Supported Sockets
- Height

#### GPUs
- TDP
- Length

#### Cases
- Supported Form Factors
- Max GPU Length

#### SSDs
- Interface (M.2, SATA)
- PCIe Generation

### Filter Logic

**AND Logic Between Filter Groups**:
- Product must match ALL active filter groups

**OR Logic Within Filter Group**:
- Product must match ANY selected value in group

**Example**:
```
Filters Active:
- Manufacturer: Intel OR AMD
- Socket: LGA 1700

Result: Show products that are:
  (Intel OR AMD) AND (LGA 1700)
```

---

## UI Components

### Filter Sidebar

**Location**: Left side of product modal
**Width**: 250px (desktop)
**Responsive**: Collapses to top on mobile

**Structure**:
```html
<aside class="product-modal__filters">
  <div class="filter-group">
    <h4>יצרן</h4>
    <div class="filter-group__options">
      <label class="filter-option">
        <input type="checkbox" />
        <span>Intel</span>
      </label>
      <!-- More options... -->
    </div>
    <button class="filter-group__show-more">הצג עוד</button>
  </div>
</aside>
```

### Filter Group

Each filter group has:
- **Title**: Hebrew label for filter type
- **Options**: Checkbox list (max 5 visible initially)
- **Show More**: Button to reveal additional options

### Toolbar Filters

**Location**: Top of modal, below search
**Filters**:
- ☑️ במלאי בלבד (In Stock Only)
- ☑️ רכיבים תואמים בלבד (Compatible Only) - **Checked by default**

---

## Customization

### Adding New Specification Filters

1. **Update `getSpecFiltersForCategory()` in product-modal.js**:

```javascript
getSpecFiltersForCategory(categoryId) {
  const categoryFilters = {
    17: ['socket', 'formFactor', 'memoryType', 'customField'], // Added customField
    // ...
  };
  return categoryFilters[categoryId] || [];
}
```

2. **Add Hebrew title in `getFilterTitle()`**:

```javascript
getFilterTitle(filterKey) {
  const titles = {
    customField: 'שדה מותאם אישית',
    // ...
  };
  return titles[filterKey] || filterKey;
}
```

3. **Ensure products have the specification**:
   - Add to Konimbo product attributes
   - OR add parsing logic in `spec-parser.js`

### Changing Default Filter State

**Enable compatibility filter by default**:
```javascript
// In open() method:
this.compatibleCheckbox.checked = true; // ✅ Default enabled
```

**Disable by default**:
```javascript
this.compatibleCheckbox.checked = false; // Only manual filtering
```

### Adjusting "Show More" Threshold

Change how many filter options show initially:

```javascript
// In createFilterGroup():
values.forEach((value, index) => {
  const optionEl = this.createFilterOption(filterKey, value);

  if (index >= 10) { // Changed from 5 to 10
    optionEl.style.display = 'none';
  }

  optionsEl.appendChild(optionEl);
});

if (values.length > 10) { // Updated threshold
  showMoreBtn.style.display = 'block';
}
```

---

## Examples

### Example 1: Building a Gaming PC

**Step 1**: Select Intel Core i7-13700K (Socket LGA 1700)

**Step 2**: Open Motherboard category
- **Before**: 100 motherboards shown (Intel + AMD)
- **After**: 45 motherboards shown (only LGA 1700)
- **Result**: AMD motherboards automatically hidden ✅

**Step 3**: Open RAM category
- Check motherboard specs: DDR5 support
- **Before**: 200 RAM modules (DDR4 + DDR5)
- **After**: 85 RAM modules (only DDR5)
- **Result**: DDR4 RAM automatically hidden ✅

### Example 2: Filtering by Manufacturer

**Scenario**: User wants only Corsair or G.Skill RAM

**Steps**:
1. Open RAM category
2. Expand "יצרן" (Manufacturer) filter
3. Check "Corsair" ☑️
4. Check "G.Skill" ☑️
5. View updated products

**Result**: Only Corsair or G.Skill RAM shown (OR logic within group)

### Example 3: Combined Filtering

**Current Config**:
- Intel CPU (LGA 1700)
- DDR5 Motherboard

**Filters Applied**:
- ☑️ Compatible Only
- ☑️ Manufacturer: Corsair
- ☑️ Memory Type: DDR5

**Result**:
- Compatible with motherboard (DDR5) ✅
- AND Corsair brand ✅
- = Only Corsair DDR5 RAM shown

---

## Technical Details

### Performance Considerations

**Compatibility Checking**:
- Runs for each product when filter enabled
- Uses temporary configuration creation
- O(n × m) where n = products, m = compatibility rules

**Optimization**:
- Results not cached (ensures accuracy with config changes)
- Only checks products in current category
- Skips checking if no products selected yet

### Filter State Management

**State Storage**:
```javascript
this.activeFilters = {
  manufacturer: ['Intel', 'AMD'],
  socket: ['LGA 1700']
};
```

**State Reset**:
- Filters reset when modal closes
- Compatibility filter resets to enabled
- Preserves search query

---

## Troubleshooting

### Compatibility Filter Not Working

**Check**:
1. Is compatibility checker loaded?
   - Console: "CompatibilityChecker: Rules loaded"
2. Are products selected in configuration?
   - Filter only applies when products exist
3. Are specifications parsed correctly?
   - Enable debug mode to see parsed specs

### No Filter Options Shown

**Cause**: Products missing specifications

**Solution**:
1. Add specifications to Konimbo products
2. Improve parsing patterns in `spec-parser.js`
3. Check category ID mapping in `getSpecFiltersForCategory()`

### Too Many Products Hidden

**Cause**: Compatibility filter too strict

**Solution**:
1. Disable compatibility filter temporarily
2. Check compatibility rules configuration
3. Adjust rule severity (error → warning)

---

## Best Practices

### For Store Owners

1. **Ensure Product Data Quality**:
   - Add specifications to all products
   - Use consistent naming (Socket LGA 1700, not LGA1700)
   - Include manufacturer information

2. **Test Configurations**:
   - Verify filters work correctly
   - Check that compatible products appear
   - Ensure no false negatives

3. **Monitor User Experience**:
   - Are users finding what they need?
   - Are too many products being filtered out?
   - Do filter labels make sense in Hebrew?

### For Developers

1. **Maintain Specification Parsing**:
   - Keep regex patterns updated
   - Add new product standards
   - Test with real product data

2. **Optimize Performance**:
   - Profile filter performance with large product catalogs
   - Consider caching if needed
   - Use debouncing for filter changes

3. **Extend Carefully**:
   - Test new filters thoroughly
   - Document custom filters
   - Maintain Hebrew translations

---

## API Reference

### ProductModal Methods

#### `filterByCompatibility(products, categoryId)`
Filters products by compatibility with current configuration.

**Parameters**:
- `products` (Array): Products to filter
- `categoryId` (number): Category ID

**Returns**: Array of compatible products

#### `applySpecFilters(products)`
Applies active specification filters.

**Parameters**:
- `products` (Array): Products to filter

**Returns**: Array of filtered products

#### `buildFilters(products, categoryId)`
Builds filter UI from products.

**Parameters**:
- `products` (Array): Products in category
- `categoryId` (number): Category ID

#### `extractFilterData(products, categoryId)`
Extracts unique filter values from products.

**Returns**: Object with filter keys and values

### CompatibilityChecker Methods

#### `isProductCompatible(product, categoryId, configuration, categories)`
Checks if product is compatible with current configuration.

**Parameters**:
- `product` (Object): Product to check
- `categoryId` (number): Product's category
- `configuration` (Object): Current configuration
- `categories` (Array): Category definitions

**Returns**: Boolean (true if compatible)

---

## Future Enhancements

Potential improvements:

- [ ] Filter result counts (show number of products per option)
- [ ] "Clear all filters" button
- [ ] Filter presets (e.g., "Budget Build", "High-End Gaming")
- [ ] Price range filter slider
- [ ] Advanced filter combinations (NOT logic, ranges)
- [ ] Save filter preferences
- [ ] Filter analytics (which filters used most)
- [ ] Smart filter suggestions based on configuration

---

**Version**: 1.0.0
**Last Updated**: 2025-11-21
