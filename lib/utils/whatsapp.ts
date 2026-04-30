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