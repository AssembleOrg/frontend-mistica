import { Sale } from '@/services/sales.service';

export interface ReceiptOptions {
  type: 'thermal' | 'a4';
  generateInvoice: boolean;
}

export function generateReceiptUrl(sale: Sale, options: ReceiptOptions): string {
  const params = new URLSearchParams({
    saleId: sale.id,
    type: options.type,
    invoice: options.generateInvoice.toString()
  });
  
  return `/receipt?${params.toString()}`;
}

export function openReceiptInNewTab(sale: Sale, options: ReceiptOptions): void {
  const url = generateReceiptUrl(sale, options);
  window.open(url, '_blank', 'width=800,height=1000,scrollbars=yes,resizable=yes');
}

/**
 * Verifica si una venta tiene datos de facturación AFIP
 */
export function hasAfipData(sale: Sale): boolean {
  return !!(sale.afipCae && sale.afipNumero && sale.afipFechaVto);
}

/**
 * Procesa la generación de comprobante o factura
 * Si la venta tiene datos de AFIP, genera factura automáticamente
 */
export function processReceiptGeneration(sale: Sale, generateInvoice: boolean): void {
  // Si la venta tiene datos de AFIP, es una factura
  const isInvoice = hasAfipData(sale);
  
  if (isInvoice) {
    // Generar factura con datos de AFIP
    console.log('🧾 Generando factura AFIP para venta:', sale.id);
    openReceiptInNewTab(sale, { type: 'a4', generateInvoice: true });
  } else if (generateInvoice) {
    // Si se solicitó factura pero aún no hay datos, esperar respuesta del backend
    // El backend generará la factura y actualizará la venta con los datos de AFIP
    console.log('⏳ Esperando generación de factura por el backend para venta:', sale.id);
    // No hacer nada aquí, el backend se encargará
  } else {
    // Generar comprobante interno
    console.log('📝 Generando comprobante interno para venta:', sale.id);
    openReceiptInNewTab(sale, { type: 'a4', generateInvoice: false });
  }
}