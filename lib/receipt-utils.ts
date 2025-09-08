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

export function processReceiptGeneration(sale: Sale, generateInvoice: boolean): void {
  if (generateInvoice) {
    // Log temporal para factura externa - aquí irá la integración futura
    console.log('🧾 Generando factura externa para venta:', sale.id);
    console.log('📄 Datos de la venta:', {
      saleNumber: sale.saleNumber,
      customer: sale.customerName,
      total: sale.total,
      items: sale.items.length,
      paymentMethod: sale.paymentMethod
    });
    
    // TODO: Integrar con servicio de facturación externa
    // Ejemplo de como podría ser:
    // await externalInvoiceService.generateInvoice(sale);
    
    alert('Factura externa se generará próximamente. Consulte los logs para detalles.');
  } else {
    // Generar comprobante interno
    console.log('📝 Generando comprobante interno para venta:', sale.id);
    
    // Abrir comprobante A4 por defecto
    openReceiptInNewTab(sale, { type: 'a4', generateInvoice: false });
  }
}