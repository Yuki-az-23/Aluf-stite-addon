/**
 * Print View Component
 * @file print-view.js
 * @description Handles printing of PC configurations
 */

import configManager from '../shared/config-manager.js';
import { DOM, Num, log } from '../shared/utils.js';

class PrintView {
  constructor(rootElement) {
    this.root = typeof rootElement === 'string'
      ? document.querySelector(rootElement)
      : rootElement;

    if (!this.root) {
      throw new Error('PrintView: Root element not found');
    }

    this.itemRowTemplate = null;
    this.itemsTbody = null;

    this.init();
  }

  /**
   * Initialize component
   */
  init() {
    log.debug('PrintView: Initializing');

    // Get elements
    this.itemsTbody = this.root.querySelector('#print-items-tbody');
    this.customerSection = this.root.querySelector('#print-customer');

    // Get template
    this.itemRowTemplate = document.querySelector('#print-item-row-template');

    log.debug('PrintView: Initialized');
  }

  /**
   * Print configuration by code
   * @param {string} code - Configuration code
   * @param {Object} options - Print options
   */
  printConfiguration(code, options = {}) {
    const printData = configManager.exportForPrint(code);

    if (!printData) {
      log.error('PrintView: Configuration not found for printing', code);
      alert('שגיאה: לא נמצאה קונפיגורציה עם הקוד שצוין');
      return;
    }

    log.debug('PrintView: Preparing print view', { code });

    // Populate print view
    this.populatePrintView(printData, options);

    // Show print view
    DOM.show(this.root);

    // Trigger print
    setTimeout(() => {
      window.print();

      // Hide print view after printing
      setTimeout(() => {
        DOM.hide(this.root);
      }, 100);
    }, 500); // Small delay to ensure rendering
  }

  /**
   * Populate print view with data
   * @param {Object} printData
   * @param {Object} options
   */
  populatePrintView(printData, options = {}) {
    // Set configuration code
    const codeElements = this.root.querySelectorAll('.print-config-code');
    codeElements.forEach(el => {
      el.textContent = printData.code;
    });

    const barcodeCodeElements = this.root.querySelectorAll('.print-config-code-barcode');
    barcodeCodeElements.forEach(el => {
      el.textContent = printData.code;
    });

    // Set date and time
    const dateEl = this.root.querySelector('.print-date');
    dateEl.textContent = printData.createdDate;

    const timeEl = this.root.querySelector('.print-time');
    timeEl.textContent = printData.createdTime;

    // Set customer name if provided
    if (printData.customerName) {
      const customerNameEl = this.root.querySelector('.print-customer-name');
      customerNameEl.textContent = printData.customerName;
      DOM.show(this.customerSection);
    } else {
      DOM.hide(this.customerSection);
    }

    // Set store info if provided
    if (options.storeName) {
      const storeNameEl = this.root.querySelector('.print-header__store-name');
      storeNameEl.textContent = options.storeName;
    }

    if (options.storePhone) {
      const storePhoneEl = this.root.querySelector('#print-store-phone');
      storePhoneEl.textContent = options.storePhone;
    }

    if (options.storeAddress) {
      const storeAddressEl = this.root.querySelector('#print-store-address');
      storeAddressEl.textContent = options.storeAddress;
    }

    // Clear existing items
    DOM.empty(this.itemsTbody);

    // Add items
    printData.items.forEach((item, index) => {
      const rowEl = this.createItemRow(item, index + 1);
      this.itemsTbody.appendChild(rowEl);
    });

    // Set total price
    const totalPriceEl = this.root.querySelector('.print-total-price');
    totalPriceEl.textContent = Num.formatPrice(printData.totalPrice);

    // Generate barcode (simple text-based barcode for now)
    this.generateBarcode(printData.code);
  }

  /**
   * Create item row element
   * @param {Object} item
   * @param {number} number
   * @returns {HTMLElement}
   */
  createItemRow(item, number) {
    const clone = this.itemRowTemplate.content.cloneNode(true);
    const rowEl = clone.querySelector('.print-table__row');

    // Set item number
    const numberEl = rowEl.querySelector('.print-item-number');
    numberEl.textContent = number;

    // Set category
    const categoryEl = rowEl.querySelector('.print-item-category');
    categoryEl.textContent = item.categoryName;

    // Set product name
    const productEl = rowEl.querySelector('.print-item-product');
    productEl.textContent = item.productName;

    // Set SKU
    const skuEl = rowEl.querySelector('.print-item-sku');
    skuEl.textContent = item.productSKU;

    // Set quantity
    const qtyEl = rowEl.querySelector('.print-item-qty');
    qtyEl.textContent = item.quantity;

    // Set unit price
    const priceEl = rowEl.querySelector('.print-item-price');
    priceEl.textContent = Num.formatPrice(item.price);

    // Set total price
    const totalEl = rowEl.querySelector('.print-item-total');
    totalEl.textContent = Num.formatPrice(item.totalPrice);

    return rowEl;
  }

  /**
   * Generate barcode for configuration code
   * @param {string} code
   */
  generateBarcode(code) {
    // Simple SVG-based barcode representation
    // For production, consider using a library like JsBarcode
    const barcodeEl = this.root.querySelector('#print-barcode');

    if (!barcodeEl) return;

    // Clear existing barcode
    barcodeEl.innerHTML = '';

    // Simple barcode visualization
    const width = 200;
    const height = 50;
    const bars = code.split('').map(char => char.charCodeAt(0) % 10);

    barcodeEl.setAttribute('width', width);
    barcodeEl.setAttribute('height', height);
    barcodeEl.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const barWidth = width / bars.length;

    bars.forEach((value, index) => {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', index * barWidth);
      rect.setAttribute('y', 0);
      rect.setAttribute('width', barWidth * 0.8);
      rect.setAttribute('height', height * (0.5 + value / 20));
      rect.setAttribute('fill', '#000');

      barcodeEl.appendChild(rect);
    });
  }

  /**
   * Destroy component
   */
  destroy() {
    log.debug('PrintView: Destroyed');
  }
}

export default PrintView;
