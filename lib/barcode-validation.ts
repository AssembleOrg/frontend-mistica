/**
 * Barcode Validation Library
 * Validates common barcode formats used in Argentina
 */

export interface BarcodeValidationResult {
  isValid: boolean;
  format: string | null;
  message: string;
  autoAccept: boolean;
}

/**
 * Validates EAN-13 barcode using check digit algorithm
 */
function validateEAN13(barcode: string): BarcodeValidationResult {
  if (!/^\d{13}$/.test(barcode)) {
    return {
      isValid: false,
      format: null,
      message: 'EAN-13 debe tener exactamente 13 dígitos',
      autoAccept: false
    };
  }

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(barcode[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  const isValid = checkDigit === parseInt(barcode[12]);

  return {
    isValid,
    format: 'EAN-13',
    message: isValid ? 'Código EAN-13 válido' : 'Código EAN-13 inválido - dígito verificador incorrecto',
    autoAccept: isValid
  };
}

/**
 * Validates UPC-A barcode using check digit algorithm
 */
function validateUPCA(barcode: string): BarcodeValidationResult {
  if (!/^\d{12}$/.test(barcode)) {
    return {
      isValid: false,
      format: null,
      message: 'UPC-A debe tener exactamente 12 dígitos',
      autoAccept: false
    };
  }

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(barcode[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  const isValid = checkDigit === parseInt(barcode[11]);

  return {
    isValid,
    format: 'UPC-A',
    message: isValid ? 'Código UPC-A válido' : 'Código UPC-A inválido - dígito verificador incorrecto',
    autoAccept: isValid
  };
}

/**
 * Validates EAN-8 barcode using check digit algorithm
 */
function validateEAN8(barcode: string): BarcodeValidationResult {
  if (!/^\d{8}$/.test(barcode)) {
    return {
      isValid: false,
      format: null,
      message: 'EAN-8 debe tener exactamente 8 dígitos',
      autoAccept: false
    };
  }

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const digit = parseInt(barcode[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }
  
  const checkDigit = (10 - (sum % 10)) % 10;
  const isValid = checkDigit === parseInt(barcode[7]);

  return {
    isValid,
    format: 'EAN-8',
    message: isValid ? 'Código EAN-8 válido' : 'Código EAN-8 inválido - dígito verificador incorrecto',
    autoAccept: isValid
  };
}

/**
 * Validates Code 128 barcode (basic format check)
 */
function validateCode128(barcode: string): BarcodeValidationResult {
  if (barcode.length < 4 || barcode.length > 48) {
    return {
      isValid: false,
      format: null,
      message: 'Code 128 debe tener entre 4 y 48 caracteres',
      autoAccept: false
    };
  }

  // Basic alphanumeric check for Code 128
  const isValid = /^[A-Za-z0-9\-\.\s]+$/.test(barcode);

  return {
    isValid,
    format: 'Code 128',
    message: isValid ? 'Código Code 128 válido' : 'Código Code 128 inválido - formato incorrecto',
    autoAccept: isValid
  };
}

/**
 * Main barcode validation function
 * Tries to detect format and validate accordingly
 */
export function validateBarcode(barcode: string): BarcodeValidationResult {
  if (!barcode || barcode.trim().length === 0) {
    return {
      isValid: false,
      format: null,
      message: 'Código de barras no puede estar vacío',
      autoAccept: false
    };
  }

  const cleanBarcode = barcode.trim();

  // Try different formats based on length and content
  if (/^\d{13}$/.test(cleanBarcode)) {
    return validateEAN13(cleanBarcode);
  }
  
  if (/^\d{12}$/.test(cleanBarcode)) {
    return validateUPCA(cleanBarcode);
  }
  
  if (/^\d{8}$/.test(cleanBarcode)) {
    return validateEAN8(cleanBarcode);
  }
  
  if (cleanBarcode.length >= 4 && cleanBarcode.length <= 48) {
    return validateCode128(cleanBarcode);
  }

  return {
    isValid: false,
    format: null,
    message: 'Formato de código de barras no reconocido',
    autoAccept: false
  };
}

/**
 * Quick validation for auto-acceptance
 * Returns true if barcode should be automatically accepted
 */
export function shouldAutoAcceptBarcode(barcode: string): boolean {
  const result = validateBarcode(barcode);
  return result.autoAccept;
}

/**
 * Get barcode format suggestions for common Argentine products
 */
export function getBarcodeFormatSuggestions(): string[] {
  return [
    'EAN-13: 13 dígitos (productos internacionales)',
    'UPC-A: 12 dígitos (productos norteamericanos)',
    'EAN-8: 8 dígitos (productos pequeños)',
    'Code 128: 4-48 caracteres alfanuméricos'
  ];
}
