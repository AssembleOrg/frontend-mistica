'use client';

import { Sale } from '@/services/sales.service';
import { useCurrencyFormat } from '@/hooks/use-currency-format';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';
import QRCode from 'qrcode';

interface ReceiptViewerProps {
  sale: Sale;
  onClose: () => void;
  type?: 'thermal' | 'a4';
}

export function ReceiptViewer({ sale, onClose, type = 'a4' }: ReceiptViewerProps) {
  const { formatCurrency } = useCurrencyFormat();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Auto-print para tickets térmicos
  useEffect(() => {
    if (type === 'thermal') {
      // Delay corto para asegurar que el componente esté renderizado
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [type]);

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

  const handlePrint = () => {
    window.print();
  };

  const handleToggleFormat = () => {
    const currentUrl = new URL(window.location.href);
    const saleId = currentUrl.searchParams.get('saleId');
    const newType = type === 'thermal' ? 'a4' : 'thermal';
    
    // Construir URL limpia con solo los parámetros necesarios
    const newUrl = `${window.location.origin}/receipt?saleId=${saleId}&type=${newType}`;
    window.open(newUrl, '_blank');
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
    website: 'www.mistica.com'
  };

  const ThermalReceipt = () => (
    <div className="receipt-thermal w-full max-w-[300px] mx-auto bg-white text-black font-mono text-xs leading-tight p-4 border border-gray-300" style={{ fontSize: '11px', lineHeight: '1.2' }}>
      {/* Header - Solo texto */}
      <div className="text-center border-b border-dashed border-gray-800 pb-2 mb-2">
        <div className="font-bold text-sm uppercase">{companyInfo.name}</div>
        <div className="text-xs">{companyInfo.address}</div>
        <div className="text-xs">{companyInfo.phone}</div>
      </div>

      {/* Comprobante Info */}
      <div className="text-center border-b border-dashed border-gray-800 pb-2 mb-2">
        <div className="font-bold text-xs uppercase">TICKET DE VENTA</div>
        <div className="text-xs">No: {sale.saleNumber}</div>
        <div className="text-xs">{formatDate(new Date(sale.createdAt))}</div>
      </div>

      {/* Customer - Solo si hay datos */}
      {(sale.customerName && sale.customerName !== 'Cliente Anónimo') && (
        <div className="border-b border-dashed border-gray-800 pb-2 mb-2">
          <div className="text-xs">Cliente: {sale.customerName}</div>
          {sale.customerPhone && (
            <div className="text-xs">Tel: {sale.customerPhone}</div>
          )}
        </div>
      )}

      {/* Items */}
      <div className="border-b border-dashed border-gray-800 pb-2 mb-2">
        {sale.items.map((item, index) => (
          <div key={index} className="mb-1">
            <div className="text-xs font-medium">{item.productName}</div>
            <div className="flex justify-between text-xs">
              <span>{item.quantity} x {formatCurrency(item.unitPrice)}</span>
              <span className="font-bold">{formatCurrency(item.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="space-y-1 border-b border-dashed border-gray-800 pb-2 mb-2">
        <div className="flex justify-between text-xs">
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between text-xs">
            <span>Descuento ({sale.discount}%):</span>
            <span>-{formatCurrency(sale.subtotal * (sale.discount / 100))}</span>
          </div>
        )}
        {sale.tax > 0 && (
          <div className="flex justify-between text-xs">
            <span>IVA (21%):</span>
            <span>{formatCurrency(sale.tax)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold border-t border-gray-800 pt-1">
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
      </div>

      {/* Payment method */}
      <div className="border-b border-dashed border-gray-800 pb-2 mb-2">
        <div className="text-xs">
          <span>Pago: {getPaymentMethodLabel(sale.paymentMethod)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs">
        <div className="mb-1">¡Gracias por su compra!</div>
        <div>{companyInfo.website}</div>
        <div className="mt-2 text-xs border-t border-dashed border-gray-800 pt-2">
          <strong>COMPROBANTE NO VÁLIDO COMO FACTURA</strong>
        </div>
        <div className="mt-2 text-xs">
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
              <div>{companyInfo.website}</div>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="bg-[#9d684e] text-white px-4 py-2 rounded-lg inline-block mb-2">
            <span className="text-lg font-bold">COMPROBANTE</span>
          </div>
          <div className="text-sm text-gray-600">
            <div><strong>No:</strong> {sale.saleNumber}</div>
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
        <div className="text-sm">
          <div><span className="font-medium">Método de pago:</span> {getPaymentMethodLabel(sale.paymentMethod)}</div>
          {sale.notes && (
            <div className="mt-2">
              <span className="font-medium">Notas:</span> {sale.notes}
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
            <div className="text-sm text-gray-600">
              Este es un comprobante de venta no fiscal
            </div>
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
          <Button onClick={onClose} variant="outline" size="sm">
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