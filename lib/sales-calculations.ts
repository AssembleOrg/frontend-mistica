/**
 * Sales Calculations Library
 * KISS approach for centralized calculation logic
 * Future-ready for backend integration
 */

export interface CalculationResult {
  subtotal: number;
  discountTotal: number;
  taxableAmount: number; // subtotal after discounts
  taxAmount: number;
  total: number;
  formattedSubtotal: string;
  formattedDiscountTotal: string;
  formattedTaxableAmount: string;
  formattedTaxAmount: string;
  formattedTotal: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  barcode: string;
  discountPercentage?: number;
  discountAmount?: number;
}

export interface CalculationSettings {
  taxRate: number; // decimal format (e.g., 0.21 for 21%)
  currency: string;
  locale: string;
}

/**
 * Default calculation settings
 */
export const DEFAULT_SETTINGS: CalculationSettings = {
  taxRate: 0.21, // 21% IVA
  currency: 'MXN',
  locale: 'es-MX'
};

/**
 * Calculate subtotal from array of sale items (before discounts)
 */
export function calculateSubtotal(items: SaleItem[]): number {
  if (!items || items.length === 0) return 0;
  
  return roundToMoney(
    items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0)
  );
}

/**
 * Calculate total discount amount from all items
 */
export function calculateDiscountTotal(items: SaleItem[]): number {
  if (!items || items.length === 0) return 0;
  
  return roundToMoney(
    items.reduce((total, item) => {
      return total + (item.discountAmount || 0);
    }, 0)
  );
}

/**
 * Calculate tax amount based on taxable amount (after discounts) and tax rate
 */
export function calculateTax(taxableAmount: number, taxRate: number): number {
  if (taxableAmount <= 0 || taxRate <= 0) return 0;
  
  return roundToMoney(taxableAmount * taxRate);
}

/**
 * Calculate total amount (taxable amount + tax)
 */
export function calculateTotal(taxableAmount: number, taxAmount: number): number {
  return roundToMoney(taxableAmount + taxAmount);
}

/**
 * Format currency with proper locale and currency
 */
export function formatCurrency(
  amount: number, 
  currency: string = DEFAULT_SETTINGS.currency, 
  locale: string = DEFAULT_SETTINGS.locale
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format number with proper locale separators
 */
export function formatNumber(
  num: number, 
  locale: string = DEFAULT_SETTINGS.locale
): number {
  return Number(new Intl.NumberFormat(locale).format(num).replace(/[^\d.-]/g, ''));
}

/**
 * Get tax rate as percentage string (for display)
 */
export function getTaxRateDisplay(taxRate: number): string {
  return `${Math.round(taxRate * 100)}%`;
}

/**
 * Main calculation function - returns complete calculation result
 * This is the primary function to use in stores and components
 * SINGLE SOURCE OF TRUTH for all sale calculations
 */
export function calculateSaleTotals(
  items: SaleItem[], 
  settings: CalculationSettings = DEFAULT_SETTINGS
): CalculationResult {
  // Step 1: Calculate subtotal (before discounts)
  const subtotal = calculateSubtotal(items);
  
  // Step 2: Calculate total discounts
  const discountTotal = calculateDiscountTotal(items);
  
  // Step 3: Calculate taxable amount (after discounts)
  const taxableAmount = roundToMoney(subtotal - discountTotal);
  
  // Step 4: Calculate tax on taxable amount
  const taxAmount = calculateTax(taxableAmount, settings.taxRate);
  
  // Step 5: Calculate final total
  const total = calculateTotal(taxableAmount, taxAmount);

  return {
    subtotal,
    discountTotal,
    taxableAmount,
    taxAmount,
    total,
    formattedSubtotal: formatCurrency(subtotal, settings.currency, settings.locale),
    formattedDiscountTotal: formatCurrency(discountTotal, settings.currency, settings.locale),
    formattedTaxableAmount: formatCurrency(taxableAmount, settings.currency, settings.locale),
    formattedTaxAmount: formatCurrency(taxAmount, settings.currency, settings.locale),
    formattedTotal: formatCurrency(total, settings.currency, settings.locale)
  };
}

/**
 * Validate calculation inputs
 */
export function validateCalculationInputs(items: SaleItem[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    errors.push('No items provided for calculation');
  }

  items.forEach((item, index) => {
    if (!item.id) errors.push(`Item ${index + 1}: Missing ID`);
    if (!item.productId) errors.push(`Item ${index + 1}: Missing product ID`);
    if (item.price < 0) errors.push(`Item ${index + 1}: Price cannot be negative`);
    if (item.quantity <= 0) errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Round to 2 decimal places (for monetary values)
 */
export function roundToMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Verify that a sale's stored calculations match the recalculated values
 * Critical for cash register accuracy
 */
export function verifySaleCalculation(
  storedSale: {
    subtotal: number;
    taxAmount: number;
    total: number;
    discountTotal?: number;
  },
  items: SaleItem[],
  taxRate: number,
  tolerance: number = 0.01
): {
  isValid: boolean;
  differences: {
    subtotal: number;
    taxAmount: number;
    total: number;
    discountTotal: number;
  };
} {
  const recalculated = calculateSaleTotals(items, { 
    taxRate, 
    currency: DEFAULT_SETTINGS.currency, 
    locale: DEFAULT_SETTINGS.locale 
  });

  const differences = {
    subtotal: roundToMoney(recalculated.subtotal - storedSale.subtotal),
    taxAmount: roundToMoney(recalculated.taxAmount - storedSale.taxAmount),
    total: roundToMoney(recalculated.total - storedSale.total),
    discountTotal: roundToMoney(recalculated.discountTotal - (storedSale.discountTotal || 0))
  };

  const isValid = 
    Math.abs(differences.subtotal) <= tolerance &&
    Math.abs(differences.taxAmount) <= tolerance &&
    Math.abs(differences.total) <= tolerance &&
    Math.abs(differences.discountTotal) <= tolerance;

  return {
    isValid,
    differences
  };
}