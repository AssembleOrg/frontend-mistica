'use client';

import { Sale } from '@/services/sales.service';
import { useCurrencyFormat } from '@/hooks/use-currency-format';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';
import QRCode from 'qrcode';
import { hasAfipData } from '@/lib/receipt-utils';
import { parseNotesAndSeller } from '@/lib/sales-seller';

interface ReceiptViewerProps {
  sale: Sale;
  onClose: () => void;
  type?: 'thermal' | 'a4';
}

export function ReceiptViewer({ sale, onClose, type = 'a4' }: ReceiptViewerProps) {
  const { formatCurrency } = useCurrencyFormat();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const { seller, notes: cleanNotes } = parseNotesAndSeller(sale.notes);

  // Generar QR aleatorio para formato A4
  useEffect(() => {
    if (type === 'a4') {
      const generateRandomQR = async () => {
        try {
          // Generar número aleatorio entre 0 y 21 (22 arcanos total)
          const randomArcano = Math.floor(Math.random() * 22);
          // URL que apunta a la vista del arcano
          const arcanoUrl = `${window.location.origin}/arcano?numero=${randomArcano}`;
          // Generar el código QR
          const qrDataUrl = await QRCode.toDataURL(arcanoUrl, {
            width: 150,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(qrDataUrl);
        } catch (error) {
          console.error('Error generando QR:', error);
        }
      };

      generateRandomQR();
    }
  }, [type]);

  const formatDate = (date: Date) => {
    return format(date, "dd/MM/yyyy HH:mm", { locale: es });
  };

  const formatAfipDate = (dateString: string): string => {
    try {
      // El formato del backend es YYYYMMDD
      const parsed = parse(dateString, 'yyyyMMdd', new Date());
      return format(parsed, 'dd/MM/yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  const isInvoice = hasAfipData(sale);

  const handlePrint = () => {
    window.print();
  };

  const handleToggleFormat = () => {
    const currentUrl = new URL(window.location.href);
    const saleId = currentUrl.searchParams.get('saleId');
    const newType = type === 'thermal' ? 'a4' : 'thermal';
    
    // Construir URL limpia con solo los parámetros necesarios
    const newUrl = `${window.location.origin}/receipt?saleId=${saleId}&type=${newType}`;
    window.location.href = newUrl;
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return 'Efectivo';
      case 'CARD': return 'Tarjeta';
      case 'TRANSFER': return 'Transferencia';
      default: return method;
    }
  };

  const companyInfo = {
    name: 'Mística Auténtica',
    address: 'Dirección de la empresa',
    phone: 'Teléfono de contacto',
    email: 'contacto@mistica.com',
  };

  const ThermalReceipt = () => (
    <div className="receipt-thermal bg-white text-black font-mono leading-tight p-2" style={{ fontSize: '11px', lineHeight: '1.3', width: '58mm', maxWidth: '58mm' }}>
      {/* Header */}
      <div className="border-b border-dashed border-gray-800 pb-2 mb-2">
        <div className="font-black uppercase" style={{ fontSize: '13px' }}>{companyInfo.name}</div>
        <div>{companyInfo.address}</div>
        <div>{companyInfo.phone}</div>
      </div>

      {/* Comprobante/Factura Info */}
      <div className="border-b border-dashed border-gray-800 pb-2 mb-2">
        <div className="font-black uppercase" style={{ fontSize: '12px' }}>
          {isInvoice ? 'FACTURA' : 'TICKET DE VENTA'}
        </div>
        <div>No: {sale.saleNumber}</div>
        {isInvoice && sale.afipNumero && (
          <div>Factura AFIP: {sale.afipNumero}</div>
        )}
        <div>{formatDate(new Date(sale.createdAt))}</div>
      </div>

      {/* Customer - Solo si hay datos */}
      {(sale.customerName && sale.customerName !== 'Cliente Anónimo') && (
        <div className="border-b border-dashed border-gray-800 pb-2 mb-2">
          <div className="font-bold">Cliente: {sale.customerName}</div>
          {sale.customerPhone && (
            <div>Tel: {sale.customerPhone}</div>
          )}
          {seller && <div>Vendedor: {seller}</div>}
        </div>
      )}

      {/* Items */}
      <div className="border-b border-dashed border-gray-800 pb-2 mb-2">
        {sale.items.map((item, index) => (
          <div key={index} className="mb-1">
            <div className="font-bold">{item.productName}</div>
            <div>{item.quantity} x {formatCurrency(item.unitPrice)}</div>
            <div className="text-right font-bold">{formatCurrency(item.subtotal)}</div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-1 border-b border-dashed border-gray-800 pb-2 mb-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <span>Descuento ({sale.discount}%):</span>
            <span>-{formatCurrency(sale.subtotal * (sale.discount / 100))}</span>
          </div>
        )}
        {sale.tax > 0 && (
          <div className="flex justify-between">
            <span>IVA (21%):</span>
            <span>{formatCurrency(sale.tax)}</span>
          </div>
        )}
        <div className="flex justify-between font-black border-t border-gray-800 pt-1" style={{ fontSize: '13px' }}>
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
      </div>

      {/* Payment breakdown */}
      <div className="border-b border-dashed border-gray-800 pb-2 mb-2">
        {(sale.payments ?? []).map((p, i) => (
          <div key={`${p.method}-${i}`} className="flex justify-between">
            <span>{getPaymentMethodLabel(p.method)}</span>
            <span>{formatCurrency(p.amount)}</span>
          </div>
        ))}
        {(() => {
          const cash = sale.payments?.find((p) => p.method === 'CASH');
          if (cash && (cash.changeGiven ?? 0) > 0) {
            return (
              <>
                <div className="flex justify-between">
                  <span>Recibido</span>
                  <span>{formatCurrency(cash.receivedAmount ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vuelto</span>
                  <span>{formatCurrency(cash.changeGiven ?? 0)}</span>
                </div>
              </>
            );
          }
          return null;
        })()}
      </div>

      {/* Footer */}
      <div>
        <div className="mb-1">¡Gracias por su compra!</div>
        {isInvoice && sale.afipCae && sale.afipFechaVto && (
          <div className="mt-2 border-t border-dashed border-gray-800 pt-2">
            <div><strong>CAE:</strong> {sale.afipCae}</div>
            <div><strong>Vto. CAE:</strong> {formatAfipDate(sale.afipFechaVto)}</div>
          </div>
        )}
        {!isInvoice && (
          <div className="mt-2 border-t border-dashed border-gray-800 pt-2">
            <div className="font-black">COMPROBANTE NO VALIDO</div>
            <div className="font-black">COMO FACTURA</div>
          </div>
        )}
        <div className="mt-2">
          {formatDate(new Date())}
        </div>
      </div>
    </div>
  );

  const A4Receipt = () => (
    <div className="receipt-a4 max-w-[210mm] mx-auto bg-white text-black min-h-[297mm] p-8">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-[#9d684e] pb-6 mb-6">
        <div className="flex items-center space-x-4">
          <Image
            src="/Logo-mistica.png"
            alt="Mística Auténtica"
            width={80}
            height={80}
            className="object-contain"
          />
          <div>
            <h1 className="text-3xl font-bold text-[#455a54] mb-2">{companyInfo.name}</h1>
            <div className="text-sm text-gray-600 space-y-1">
              <div>{companyInfo.address}</div>
              <div>{companyInfo.phone} • {companyInfo.email}</div>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="bg-[#9d684e] text-white px-4 py-2 rounded-lg inline-block mb-2">
            <span className="text-lg font-bold">{isInvoice ? 'FACTURA' : 'COMPROBANTE'}</span>
          </div>
          <div className="text-sm text-gray-600">
            <div><strong>No:</strong> {sale.saleNumber}</div>
            {isInvoice && sale.afipNumero && (
              <div><strong>Factura AFIP:</strong> {sale.afipNumero}</div>
            )}
            <div><strong>Fecha:</strong> {formatDate(new Date(sale.createdAt))}</div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#455a54] mb-2">Información del Cliente</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Nombre:</span> {sale.customerName}
          </div>
          {sale.customerPhone && (
            <div>
              <span className="font-medium">Teléfono:</span> {sale.customerPhone}
            </div>
          )}
          {seller && (
            <div>
              <span className="font-medium">Vendedor:</span> {seller}
            </div>
          )}
          {sale.customerEmail && (
            <div>
              <span className="font-medium">Email:</span> {sale.customerEmail}
            </div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#455a54] text-white">
              <th className="border border-gray-300 px-4 py-3 text-left">Producto</th>
              <th className="border border-gray-300 px-4 py-3 text-center">Cantidad</th>
              <th className="border border-gray-300 px-4 py-3 text-right">Precio Unit.</th>
              <th className="border border-gray-300 px-4 py-3 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="border border-gray-300 px-4 py-3">{item.productName}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">{item.quantity}</td>
                <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="border border-gray-300 px-4 py-3 text-right font-medium">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-80">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuento ({sale.discount}%):</span>
                <span>-{formatCurrency(sale.subtotal * (sale.discount / 100))}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>IVA (21%):</span>
              <span>{formatCurrency(sale.tax)}</span>
            </div>
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between text-lg font-bold text-[#455a54]">
                <span>TOTAL:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-[#455a54] mb-2">Información de Pago</h3>
        <div className="text-sm space-y-1">
          {(sale.payments ?? []).map((p, i) => (
            <div key={`${p.method}-${i}`}>
              <span className="font-medium">{getPaymentMethodLabel(p.method)}:</span>{' '}
              {formatCurrency(p.amount)}
              {p.method === 'CASH' && (p.changeGiven ?? 0) > 0 && (
                <span className="text-xs text-gray-600 ml-2">
                  (entregó {formatCurrency(p.receivedAmount ?? 0)} · vuelto{' '}
                  {formatCurrency(p.changeGiven ?? 0)})
                </span>
              )}
            </div>
          ))}
          {cleanNotes && (
            <div className="mt-2">
              <span className="font-medium">Notas:</span> {cleanNotes}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-[#9d684e] pt-6 mt-12">
        <div className="flex justify-between items-center">
          {/* Left side - Company info */}
          <div className="flex-1">
            <div className="text-xl font-bold text-[#455a54] mb-2">¡Gracias por su compra!</div>
            {isInvoice && sale.afipCae && sale.afipFechaVto && (
              <div className="text-sm text-gray-700 mb-3 bg-gray-50 p-3 rounded-lg">
                <div className="font-semibold mb-1">Datos de Facturación AFIP:</div>
                <div><strong>CAE:</strong> {sale.afipCae}</div>
                <div><strong>Vencimiento CAE:</strong> {formatAfipDate(sale.afipFechaVto)}</div>
              </div>
            )}
            {!isInvoice && (
              <div className="text-sm text-gray-600">
                Este es un comprobante de venta no fiscal
              </div>
            )}
            <div className="text-sm text-gray-600">
              Para cualquier consulta, contáctenos en {companyInfo.phone} o {companyInfo.email}
            </div>
            <div className="text-xs text-gray-500 mt-4">
              Impreso el {formatDate(new Date())}
            </div>
          </div>
          
          {/* Right side - QR Code */}
          {qrCodeUrl && (
            <div className="flex-shrink-0 text-center ml-8">
              <div className="text-sm font-medium text-[#455a54] mb-2">
                🔮 Tu Mensaje del Tarot
              </div>
              <img 
                src={qrCodeUrl} 
                alt="QR Mensaje del Tarot" 
                className="mx-auto border border-gray-300 rounded-lg"
                style={{ width: 120, height: 120 }}
              />
              <div className="text-xs text-gray-500 mt-2">
                Escanea para recibir<br />tu mensaje personalizado
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-full max-h-full overflow-auto">
        {/* Controls */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center print:hidden">
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button
              onClick={handleToggleFormat}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {type === 'thermal' ? 'Ver A4' : 'Ver Térmico'}
            </Button>
          </div>
          <Button onClick={type === 'thermal' ? () => window.close() : onClose} variant="outline" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Receipt Content */}
        <div className="p-4">
          {type === 'thermal' ? <ThermalReceipt /> : <A4Receipt />}
        </div>
      </div>
    </div>
  );
}