# Compatibility Checking System

Complete guide to the product compatibility checking system in the Konimbo PC Configurator.

## Table of Contents

1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Compatibility Rules](#compatibility-rules)
4. [Product Specifications](#product-specifications)
5. [Configuration](#configuration)
6. [Examples](#examples)
7. [Customization](#customization)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The compatibility checking system automatically validates that selected PC components work together correctly. It checks:

- **CPU Socket Compatibility**: CPU socket must match motherboard socket
- **RAM Compatibility**: RAM type and speed must match motherboard
- **Cooler Compatibility**: CPU cooler must support CPU socket
- **Power Requirements**: PSU wattage must be sufficient for all components
- **Physical Clearance**: Components must fit in the case
- **Interface Compatibility**: Storage devices must have available slots

### Severity Levels

The system categorizes compatibility issues by severity:

| Severity | Icon | Blocks Cart | Description |
|----------|------|-------------|-------------|
| **Error** | ❌ | Yes | Critical incompatibility - prevents adding to cart |
| **Warning** | ⚠️ | No | Potential issue - user should verify |
| **Info** | ℹ️ | No | Recommendation for optimal configuration |

---

## How It Works

### Architecture

```
User Selects Product
        ↓
SpecParser extracts specifications
        ↓
StateManager adds product to configuration
        ↓
CompatibilityChecker validates configuration
        ↓
BasketManager displays validation results
```

### Components

1. **SpecParser** (`components/shared/spec-parser.js`)
   - Extracts component specifications from product data
   - Normalizes specification values
   - Category-specific parsing logic

2. **CompatibilityChecker** (`components/shared/compatibility-checker.js`)
   - Validates configurations against rules
   - Supports multiple rule types
   - Extensible rule engine

3. **Compatibility Rules** (`config/compatibility-rules.json`)
   - Configuration file defining all compatibility rules
   - Field mappings for specification normalization
   - Customizable messages

---

## Compatibility Rules

### Rule Structure

```json
{
  "id": "unique_rule_id",
  "name": "Human-readable name",
  "description": "What this rule checks",
  "severity": "error|warning|info",
  "categories": {
    "primary": [categoryId1, categoryId2],
    "secondary": [categoryId3] or "all"
  },
  "rule": {
    "type": "rule_type",
    "primaryField": "fieldName",
    "secondaryField": "fieldName",
    "message": "Error message with {placeholders}"
  }
}
```

### Rule Types

#### 1. `field_match`
Checks that two fields have identical values.

**Example**: CPU socket must match motherboard socket
```json
{
  "type": "field_match",
  "primaryField": "socket",
  "secondaryField": "socket",
  "message": "Socket המעבד ({primaryValue}) לא תואם ל-Socket של לוח האם ({secondaryValue})"
}
```

#### 2. `max_value`
Checks that a value doesn't exceed a maximum.

**Example**: GPU length must fit in case
```json
{
  "type": "max_value",
  "primaryField": "maxGPULength",
  "secondaryField": "length",
  "message": "כרטיס המסך ({secondaryValue}mm) ארוך מדי למארז (מקסימום {primaryValue}mm)"
}
```

#### 3. `array_contains`
Checks that an array contains a specific value.

**Example**: CPU cooler must support CPU socket
```json
{
  "type": "array_contains",
  "primaryField": "supportedSockets",
  "secondaryField": "socket",
  "message": "מקרר המעבד אינו תומך ב-Socket {secondaryValue}"
}
```

#### 4. `total_power`
Checks that PSU wattage is sufficient for all components.

**Example**: PSU wattage calculation
```json
{
  "type": "total_power",
  "primaryField": "wattage",
  "secondaryField": "tdp",
  "safetyMargin": 1.2,
  "message": "הספק ספק הכוח ({primaryValue}W) אינו מספיק"
}
```

#### 5. `power_connectors`
Checks that PSU has required power connectors.

**Example**: GPU power connector requirements
```json
{
  "type": "power_connectors",
  "primaryField": "powerConnectors",
  "secondaryField": "availableConnectors",
  "message": "ספק הכוח חסר מחברי חשמל נדרשים ({primaryValue})"
}
```

#### 6. `mutually_exclusive`
Checks that two categories aren't both selected.

**Example**: Intel vs AMD CPUs
```json
{
  "type": "mutually_exclusive",
  "message": "לא ניתן לבחור גם מעבד Intel וגם מעבד AMD"
}
```

#### 7. `slot_count`
Checks that motherboard has enough slots/ports.

**Example**: M.2 SSD slots
```json
{
  "type": "slot_count",
  "primaryField": "m2Slots",
  "secondaryField": "interface",
  "secondaryValue": "M.2",
  "message": "לוח האם יש רק {primaryValue} חריצי M.2"
}
```

#### 8. `count_recommendation`
Recommends specific product quantities.

**Example**: RAM in dual channel
```json
{
  "type": "count_recommendation",
  "preferredCounts": [2, 4],
  "message": "מומלץ להשתמש בזיכרון בזוגות (2 או 4 מודולים)"
}
```

---

## Product Specifications

### Required Specifications by Category

#### CPUs (Categories 32, 33)
```javascript
{
  socket: "LGA 1700" | "AM5" | "AM4",
  tdp: 125  // Watts
}
```

#### Motherboards (Category 17)
```javascript
{
  socket: "LGA 1700",
  formFactor: "ATX" | "Micro-ATX" | "Mini-ITX",
  memoryType: "DDR5" | "DDR4",
  maxMemorySpeed: 5200,  // MHz
  m2Slots: 2,
  sataPorts: 6,
  maxPcieGen: 5
}
```

#### RAM (Category 169)
```javascript
{
  memoryType: "DDR5" | "DDR4",
  memorySpeed: 5200  // MHz
}
```

#### PSU (Category 64)
```javascript
{
  wattage: 750,  // Watts
  availableConnectors: {
    "8-pin pcie": 2,
    "6-pin pcie": 2,
    "24-pin atx": 1
  }
}
```

#### CPU Coolers (Categories 34, 40)
```javascript
{
  supportedSockets: ["LGA 1700", "LGA 1200"],
  height: 160  // mm
}
```

#### GPUs (Category 82)
```javascript
{
  length: 320,  // mm
  tdp: 250,     // Watts
  powerConnectors: {
    "8-pin pcie": 2
  }
}
```

#### Cases (Category 95)
```javascript
{
  supportedFormFactors: ["ATX", "Micro-ATX", "Mini-ITX"],
  maxGPULength: 350,      // mm
  maxCoolerHeight: 170    // mm
}
```

#### SSDs (Category 172)
```javascript
{
  interface: "M.2" | "SATA",
  pcieGen: 4  // For NVMe drives
}
```

### How Specifications Are Extracted

The **SpecParser** automatically extracts specifications from:

1. **Product Name**: `"Intel Core i7-13700K LGA 1700"`
   - Extracted: `socket: "LGA 1700"`

2. **Product Description**: `"DDR5 memory, 5200 MHz"`
   - Extracted: `memoryType: "DDR5"`, `memorySpeed: 5200`

3. **Product Attributes**: Konimbo custom fields
   - Direct mapping to specifications

### Specification Normalization

The parser normalizes values for consistent matching:

**Socket Names**:
- `LGA1700` → `LGA 1700`
- `AM 5` → `AM5`

**Form Factors**:
- `mATX` → `Micro-ATX`
- `MiniITX` → `Mini-ITX`

**Memory Type**:
- `DDR-5` → `DDR5`
- `ddr 4` → `DDR4`

---

## Configuration

### config/compatibility-rules.json

The main configuration file contains:

```json
{
  "version": "1.0.0",
  "compatibilityRules": [
    // Array of all compatibility rules
  ],
  "fieldMappings": {
    // Field alias mappings
    "socket": {
      "aliases": ["Socket", "cpu_socket", "socketType"],
      "description": "CPU/Motherboard socket type"
    }
  },
  "severityLevels": {
    // Severity level definitions
  }
}
```

### Field Mappings

Field mappings allow the system to recognize different field names:

```json
{
  "memoryType": {
    "aliases": ["memory_type", "ramType", "ddr"],
    "description": "RAM type",
    "examples": ["DDR5", "DDR4", "DDR3"]
  }
}
```

This means the parser will check for:
- `product.specifications.memoryType`
- `product.specifications.memory_type`
- `product.specifications.ramType`
- `product.specifications.ddr`

---

## Examples

### Example 1: CPU-Motherboard Socket Mismatch

**Configuration**:
- CPU: Intel Core i7-13700K (Socket: LGA 1700)
- Motherboard: ASUS Z690 (Socket: LGA 1200)

**Result**:
```
❌ Socket המעבד (LGA 1700) לא תואם ל-Socket של לוח האם (LGA 1200)
```

**Action**: User cannot add to cart until fixed.

---

### Example 2: Insufficient PSU Wattage

**Configuration**:
- PSU: 550W
- CPU: 125W TDP
- GPU: 250W TDP
- Other components: ~100W

**Calculation**:
- Total TDP: 475W
- Required (with 20% margin): 570W

**Result**:
```
❌ הספק ספק הכוח (550W) אינו מספיק למערכת (נדרש לפחות 570W)
```

---

### Example 3: GPU Too Long for Case

**Configuration**:
- Case: Max GPU Length 320mm
- GPU: Length 350mm

**Result**:
```
⚠️ כרטיס המסך (350mm) ארוך מדי למארז (מקסימום 320mm)
```

**Action**: Warning shown, but user can proceed (may fit with modifications).

---

### Example 4: RAM Not in Dual Channel

**Configuration**:
- RAM: 1x 16GB DDR5

**Result**:
```
ℹ️ מומלץ להשתמש בזיכרון בזוגות (2 או 4 מודולים) לביצועים אופטימליים
```

**Action**: Info message, user can proceed.

---

## Customization

### Adding a New Rule

1. **Edit `config/compatibility-rules.json`**:

```json
{
  "id": "custom_rule_name",
  "name": "My Custom Rule",
  "description": "What it checks",
  "severity": "warning",
  "categories": {
    "primary": [categoryId],
    "secondary": [categoryId]
  },
  "rule": {
    "type": "field_match",
    "primaryField": "myField",
    "secondaryField": "otherField",
    "message": "Custom error message"
  }
}
```

2. **Ensure products have required specifications**:

Update product data in Konimbo or add parsing logic in `spec-parser.js`.

### Adding Custom Specification Fields

1. **Add field mapping in `compatibility-rules.json`**:

```json
{
  "fieldMappings": {
    "customField": {
      "aliases": ["custom_field", "customAttr"],
      "description": "My custom field"
    }
  }
}
```

2. **Add parsing logic in `spec-parser.js`** (if needed):

```javascript
// In SpecParser class
extractCustomField(text) {
  const match = text.match(/pattern/);
  if (match) {
    return match[1];
  }
  return null;
}
```

### Disabling Specific Rules

Comment out or remove rules from `compatibility-rules.json`:

```json
{
  "compatibilityRules": [
    // Rule 1 (active)
    { "id": "rule1", ... },

    // Rule 2 (disabled)
    // { "id": "rule2", ... }
  ]
}
```

---

## Troubleshooting

### Compatibility Checks Not Working

**Check**:
1. Are compatibility rules loaded?
   - Open browser console
   - Look for: `"CompatibilityChecker: Rules loaded"`

2. Are specifications being extracted?
   - Add `debug: true` to configurator options
   - Check console for specification data

3. Is the rule file accessible?
   - Verify file path in configurator initialization
   - Check browser network tab for 404 errors

### Specifications Not Detected

**Solution 1**: Add specifications manually to Konimbo product attributes

In Konimbo admin → Product → Attributes:
```
socket: LGA 1700
tdp: 125
```

**Solution 2**: Improve parsing patterns in `spec-parser.js`

Add more regex patterns:
```javascript
socket: [
  /Socket\s*(LGA\s*\d+|AM\d+)/i,
  /\((LGA\s*\d+|AM\d+)\)/i,  // Added
  /-\s*(LGA\s*\d+|AM\d+)/i   // Added
]
```

### False Positive Warnings

**Check rule configuration**:
- Is severity level appropriate?
- Are field names correct?
- Are field mappings defined?

**Adjust rule**:
```json
{
  "severity": "info",  // Changed from "warning"
  // OR remove rule entirely
}
```

### Performance Issues

If validation is slow with large configurations:

1. **Reduce rule complexity**: Remove expensive rules
2. **Optimize parsing**: Cache parsed specifications
3. **Debounce validation**: Don't validate on every change

---

## Best Practices

### For Store Owners

1. **Add specifications to products**: The more data, the better validation
2. **Test compatibility rules**: Verify with real product combinations
3. **Use appropriate severity**: Don't block cart for minor issues
4. **Provide clear messages**: Users should understand the issue
5. **Keep rules updated**: Update as new products/standards emerge

### For Developers

1. **Normalize specifications**: Use consistent formats
2. **Handle missing data**: Gracefully skip checks if specs missing
3. **Log validation results**: Help debugging
4. **Test edge cases**: Multiple products, empty configs, etc.
5. **Document custom fields**: Keep field mappings updated

---

## API Reference

### CompatibilityChecker

```javascript
import compatibilityChecker from './compatibility-checker.js';

// Load rules
await compatibilityChecker.loadRules('/path/to/rules.json');

// Check configuration
const issues = compatibilityChecker.checkConfiguration(
  configuration,
  categories
);

// Result
{
  errors: [...],
  warnings: [...],
  info: [...]
}
```

### SpecParser

```javascript
import specParser from './spec-parser.js';

// Parse all specs
const specs = specParser.parse(product);

// Parse by category
const specs = specParser.parseByCategory(product, categoryId);

// Extract specific field
const socket = specParser.extractSocketString(productName);
```

---

## Future Enhancements

Potential improvements:

- [ ] AI-powered compatibility checking
- [ ] Community-sourced compatibility database
- [ ] Automatic specification extraction from manufacturer APIs
- [ ] Performance profiling for component combinations
- [ ] Bottleneck detection (e.g., CPU bottlenecks GPU)
- [ ] Price/performance optimization suggestions
- [ ] Compatibility percentage score
- [ ] Visual compatibility matrix

---

**Version**: 1.0.0
**Last Updated**: 2025-11-21
