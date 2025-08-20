// Utilities for barcode generation and validation

/**
 * Generate a unique MÍSTICA barcode for a product
 * Format: MST + timestamp(6) + random(4) = 13 characters
 * Uses crypto.randomUUID() for better uniqueness
 */
export function generateMisticaBarcode(): string {
  const prefix = 'MST';
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const randomSuffix = crypto.randomUUID().replace(/\D/g, '').slice(0, 4); // Extract 4 digits from UUID

  return `${prefix}${timestamp}${randomSuffix}`;
}

// Alias for easier importing
export const generateBarcode = generateMisticaBarcode;

/**
 * Generate a unique barcode with duplicate validation
 * Requires validation function to ensure uniqueness
 */
export function generateUniqueBarcode(
  isBarcodeDuplicate: (barcode: string) => boolean,
  maxRetries: number = 10
): string {
  let attempts = 0;
  let barcode: string;

  do {
    barcode = generateMisticaBarcode();
    attempts++;

    if (attempts >= maxRetries) {
      throw new Error(
        'Failed to generate unique barcode after maximum retries'
      );
    }
  } while (isBarcodeDuplicate(barcode));

  return barcode;
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
  return generateMisticaBarcode();
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(
  salePrice: number,
  costPrice: number
): number {
  if (costPrice <= 0) return 0;
  return Math.round(((salePrice - costPrice) / costPrice) * 100 * 100) / 100; // Round to 2 decimals
}
