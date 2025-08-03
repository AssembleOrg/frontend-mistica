// Utilities for barcode generation and validation

/**
 * Generate a unique MÍSTICA barcode for a product
 * Format: MST + timestamp(6) + productId(4) = 13 characters
 * Example: MST789123001 for product ID 1
 */
export function generateMisticaBarcode(productId: string | number): string {
  const prefix = 'MST';
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const id = productId.toString().padStart(4, '0'); // Pad with zeros to 4 digits
  
  return `${prefix}${timestamp}${id}`;
}

/**
 * Validate barcode format for MÍSTICA products
 * Must be 13 characters starting with MST
 */
export function validateMisticaBarcode(barcode: string): boolean {
  if (!barcode || typeof barcode !== 'string') {
    return false;
  }
  
  // Must be exactly 13 characters
  if (barcode.length !== 13) {
    return false;
  }
  
  // Must start with MST
  if (!barcode.startsWith('MST')) {
    return false;
  }
  
  // Remaining 10 characters must be digits
  const remaining = barcode.slice(3);
  return /^\d{10}$/.test(remaining);
}

/**
 * Extract product ID from MÍSTICA barcode
 * Returns the last 4 digits as number
 */
export function extractProductIdFromBarcode(barcode: string): number | null {
  if (!validateMisticaBarcode(barcode)) {
    return null;
  }
  
  const productIdStr = barcode.slice(-4);
  return parseInt(productIdStr, 10);
}

/**
 * Check if barcode is a MÍSTICA generated code
 */
export function isMisticaBarcode(barcode: string): boolean {
  return validateMisticaBarcode(barcode);
}

/**
 * Generate a random barcode for testing purposes
 */
export function generateRandomBarcode(): string {
  const randomId = Math.floor(Math.random() * 9999) + 1;
  return generateMisticaBarcode(randomId);
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(salePrice: number, costPrice: number): number {
  if (costPrice <= 0) return 0;
  return Math.round(((salePrice - costPrice) / costPrice) * 100 * 100) / 100; // Round to 2 decimals
}