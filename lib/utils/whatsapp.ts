/**
 * WhatsApp Utilities
 * 
 * Helper functions for WhatsApp Web integration
 */

export const PISTECH_WHATSAPP = '+54 9 11 3820-7230';
export const DEFAULT_MESSAGE = 'Hola, desde Mistica.';

/**
 * Opens WhatsApp Web with pre-filled message to PisTech
 * 
 * @param message - Custom message (optional, defaults to "Hola, desde Mistica.")
 * @param phoneNumber - Custom phone number (optional, defaults to PisTech)
 */
export function openWhatsAppWeb(
  message: string = DEFAULT_MESSAGE,
  phoneNumber: string = PISTECH_WHATSAPP
): void {
  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = phoneNumber.replace(/[\s-]/g, '');
  
  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);
  
  // WhatsApp Web URL
  const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
  
  // Open in new tab
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Contact PisTech via WhatsApp with default message
 */
export function contactPisTech(): void {
  openWhatsAppWeb(DEFAULT_MESSAGE, PISTECH_WHATSAPP);
}

/**
 * Cosmetic Argentine phone formatting while typing.
 * Keeps only digits and groups them as "11 1234-5678" (area + number).
 * Does not enforce length — purely visual aid for the input.
 */
export function formatPhoneAR(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * Builds a wa.me link from an Argentine phone number.
 * Normalizes to international format: 54 9 + area + number,
 * stripping leading 0 (long distance) and 15 (mobile prefix).
 */
export function getWhatsAppLink(phone: string): string {
  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('54')) {
    digits = digits.slice(2);
    if (digits.startsWith('9')) digits = digits.slice(1);
  }
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.startsWith('15')) digits = digits.slice(2);

  return `https://wa.me/549${digits}`;
}