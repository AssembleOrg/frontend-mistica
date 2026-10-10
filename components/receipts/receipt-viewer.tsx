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
  /** Imprimir apenas carga y cerrar la ventana al terminar ("Imprimir ticket"). */
  autoPrint?: boolean;
}

/**
 * Cuánto papel avanza la térmica después del ticket, para que lo impreso
 * pase la sierra y se corte entero. El driver recorta el blanco del final,
 * por eso el espacio termina en una marca mínima. Se ajusta desde el ticket y
 * queda guardado en esta compu.
 */
const FEED_KEY = 'mistica:ticket-feed-mm';
const DEFAULT_FEED_MM = 15;

export function ReceiptViewer({ sale, onClose, type = 'a4', autoPrint = false }: ReceiptViewerProps) {
  const { formatCurrency } = useCurrencyFormat();
  const { seller, notes: cleanNotes } = parseNotesAndSeller(sale.notes);
  const [feedMm, setFeedMm] = useState(DEFAULT_FEED_MM);

  useEffect(() => {
    const raw = window.localStorage.getItem(FEED_KEY);
    const saved = raw === null ? NaN : Number(raw);
    if (Number.isFinite(saved) && saved >= 0 && saved <= 60) setFeedMm(saved);
  }, []);

  function changeFeed(value: number) {
    const mm = Math.min(60, Math.max(0, Math.round(value) || 0));
    setFeedMm(mm);
    window.localStorage.setItem(FEED_KEY, String(mm));
  }

  // QR del Mensaje del Tarot (A4 y térmico). URL fija: la carta se sortea en
  // cada escaneo, así una mesa entera saca cartas distintas con un solo ticket.
  // Alta resolución + quiet zone (margin 2) para que escanee bien en térmica 203 DPI.
  // null = generando, '' = falló (el ticket sale igual, sin QR).
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/arcano/random`, {
      width: 320,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then(setQrCodeUrl)
      .catch(() => setQrCodeUrl(''));
  }, []);

  // "Imprimir ticket": imprime solo (con las fuentes y el QR ya cargados) y cierra.
  useEffect(() => {
    if (!autoPrint || qrCodeUrl === null) return;
    const close = () => window.close();
    window.addEventListener('afterprint', close);
    let timer: number | undefined;
    void document.fonts.ready.then(() => {
      timer = window.setTimeout(() => window.print(), 250);
    });
    return () => {
      window.removeEventListener('afterprint', close);
      if (timer) window.clearTimeout(timer);
    };
  }, [autoPrint, qrCodeUrl]);

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

  // Venta con saldo pendiente (pago parcial): el ticket muestra el Total real,
  // lo pagado (total − saldo) y lo que resta abonar. Ya no existe el estado "seña".
  const hasBalance = (sale.balanceDue ?? 0) > 0;
  const montoPagado = sale.total - (sale.balanceDue ?? 0);

  // Cobro de saldos de ventas anteriores listados como ítems: el subtotal
  // mostrado los incluye para que las líneas cuadren con el Subtotal y el TOTAL.
  const settledTotal = (sale.settledLines || []).reduce((acc, l) => acc + (l.amount || 0), 0);
  const displaySubtotal = sale.subtotal + settledTotal;

  const handlePrint = () => {
    window.print();
  };

  // Desde el A4: pasar al ticket térmico e imprimirlo directo.
  const handlePrintTicket = () => {
    window.location.href = `${window.location.origin}/receipt?saleId=${sale.id}&type=thermal&print=1`;
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
      case 'MERCADOPAGO': return 'MercadoPago';
      default: return method;
    }
  };

  const companyInfo = {
    name: 'Mística Auténtica',
    address: 'Videla 57',
    phone: '011-7988-3333',
    email: 'contacto@mistica.com',
  };

  const ThermalReceipt = () => (
    <div className="receipt-thermal bg-white text-black font-mono leading-tight p-2 break-words" style={{ fontSize: '10px', lineHeight: '1.25', width: '80mm', maxWidth: '80mm' }}>
      {/* Header */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <div className="thermal-title font-black uppercase break-words" style={{ fontSize: '13px' }}>{companyInfo.name}</div>
        <div className="thermal-company-sub break-words">{companyInfo.address}</div>
        <div className="thermal-company-sub break-words">{companyInfo.phone}</div>
      </div>

      {/* Comprobante/Factura Info */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        <div className="thermal-subtitle font-black uppercase" style={{ fontSize: '12px' }}>
          {isInvoice ? 'FACTURA' : 'TICKET DE VENTA'}
        </div>
        <div className="thermal-meta break-words">No: {sale.saleNumber}</div>
        {isInvoice && sale.afipNumero && (
          <div className="thermal-meta break-words">Factura AFIP: {sale.afipNumero}</div>
        )}
        <div className="thermal-meta">{formatDate(new Date(sale.createdAt))}</div>
      </div>

      {/* Customer - Solo si hay datos */}
      {(sale.customerName && sale.customerName !== 'Cliente Anónimo') && (
        <div className="border-b border-dashed border-black pb-2 mb-2">
          <div className="font-bold break-words">Cliente: {sale.customerName}</div>
          {sale.customerPhone && (
            <div className="break-words">Tel: {sale.customerPhone}</div>
          )}
          {seller && <div className="break-words">Vendedor: {seller}</div>}
        </div>
      )}

      {/* Items */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        {sale.items.map((item, index) => (
          <div key={index} className="mb-1">
            <div className="font-bold break-words">{item.productName}</div>
            <div className="flex justify-between gap-1">
              <span className="thermal-label flex-1 mr-1">{item.quantity} x {formatCurrency(item.unitPrice)}</span>
              <span className="thermal-amount shrink-0">{formatCurrency(item.subtotal)}</span>
            </div>
          </div>
        ))}
        {/* Cobro de saldo de ventas anteriores: línea como si fuera un ítem. */}
        {(sale.settledLines || []).map((l, i) => (
          <div key={`settle-${i}`} className="mb-1">
            <div className="font-bold break-words">Saldo pendiente {l.saleName?.trim() || l.saleNumber}</div>
            <div className="flex justify-between gap-1">
              <span className="thermal-label flex-1 mr-1">Cobro de saldo</span>
              <span className="thermal-amount shrink-0">{formatCurrency(l.amount)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Totals - label izq, monto a la derecha (estilo sublimarte) */}
      <div className="space-y-1 border-b border-dashed border-black pb-2 mb-2">
        <div className="flex justify-between gap-1">
          <span className="thermal-label flex-1 mr-1">Subtotal:</span>
          <span className="thermal-amount shrink-0">{formatCurrency(displaySubtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between gap-1">
            <span className="thermal-label flex-1 mr-1">Descuento:</span>
            <span className="thermal-amount shrink-0">- {formatCurrency(sale.discount)}</span>
          </div>
        )}
        {sale.tax > 0 && (
          <div className="flex justify-between gap-1">
            <span className="thermal-label flex-1 mr-1">IVA (21%):</span>
            <span className="thermal-amount shrink-0">{formatCurrency(sale.tax)}</span>
          </div>
        )}
        <div className="thermal-total flex justify-between gap-1 border-t border-black pt-1 mt-1">
          <span className="flex-1 mr-1">TOTAL:</span>
          <span className="shrink-0">{formatCurrency(sale.total)}</span>
        </div>
        {hasBalance && (
          <>
            <div className="thermal-sena-header border-t border-black pt-1 mt-1 text-center">
              SEÑA / PAGO PARCIAL
            </div>
            <div className="flex justify-between gap-1">
              <span className="thermal-label flex-1 mr-1">Abonado:</span>
              <span className="thermal-amount shrink-0">{formatCurrency(montoPagado)}</span>
            </div>
            <div className="thermal-resta flex justify-between gap-1">
              <span className="flex-1 mr-1">RESTA ABONAR:</span>
              <span className="shrink-0">{formatCurrency(sale.balanceDue ?? 0)}</span>
            </div>
          </>
        )}
      </div>

      {/* Payment breakdown - label izq, monto a la derecha */}
      <div className="border-b border-dashed border-black pb-2 mb-2">
        {(sale.payments ?? []).map((p, i) => (
          <div key={`${p.method}-${i}`} className="flex justify-between gap-1">
            <span className="thermal-label flex-1 mr-1">{getPaymentMethodLabel(p.method)}</span>
            <span className="thermal-amount shrink-0">{formatCurrency(p.amount)}</span>
          </div>
        ))}
      </div>

      {/* QR Mensaje del Tarot */}
      {qrCodeUrl && (
        <div className="qr-thermal border-b border-dashed border-black pb-2 mb-2" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '10px' }}>🔮 Tu mensaje del Tarot</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCodeUrl}
            alt="QR Tarot"
            style={{ width: '28mm', height: '28mm', margin: '4px auto', display: 'block' }}
          />
          <div style={{ fontSize: '9px' }}>Escaneá para tu mensaje personalizado</div>
        </div>
      )}

      {/* Footer */}
      <div>
        <div className="thermal-thanks mb-1">¡Gracias por su compra!</div>
        {isInvoice && sale.afipCae && sale.afipFechaVto && (
          <div className="mt-2 border-t border-dashed border-black pt-2">
            <div className="break-words"><strong>CAE:</strong> {sale.afipCae}</div>
            <div className="break-words"><strong>Vto. CAE:</strong> {formatAfipDate(sale.afipFechaVto)}</div>
          </div>
        )}
        {!isInvoice && (
          <div className="mt-2 border-t border-dashed border-black pt-2">
            <div className="thermal-fineprint">COMPROBANTE NO VALIDO COMO FACTURA</div>
          </div>
        )}
        <div className="mt-2">
          {formatDate(new Date())}
        </div>
      </div>

      {/* Avance para el corte (sólo al imprimir): espacio + marca mínima, si no
          el driver recorta el blanco y lo último queda adentro de la impresora. */}
      <div className="thermal-feed" aria-hidden style={{ height: `${feedMm}mm` }} />
      <div className="thermal-end" aria-hidden>.</div>
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
            {/* Cobro de saldo de ventas anteriores: fila como si fuera un ítem. */}
            {(sale.settledLines || []).map((l, i) => (
              <tr key={`settle-${i}`} className="border-b">
                <td className="border border-gray-300 px-4 py-3">Saldo pendiente {l.saleName?.trim() || l.saleNumber}</td>
                <td className="border border-gray-300 px-4 py-3 text-center">1</td>
                <td className="border border-gray-300 px-4 py-3 text-right">{formatCurrency(l.amount)}</td>
                <td className="border border-gray-300 px-4 py-3 text-right font-medium">{formatCurrency(l.amount)}</td>
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
              <span>{formatCurrency(displaySubtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Descuento:</span>
                <span>-{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between">
                <span>IVA (21%):</span>
                <span>{formatCurrency(sale.tax)}</span>
              </div>
            )}
            <div className="border-t border-gray-300 pt-2">
              <div className="flex justify-between text-lg font-bold text-[#455a54]">
                <span>TOTAL:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
            </div>
            {hasBalance && (
              <div className="border-t border-gray-300 pt-2 space-y-2">
                <div className="flex justify-between">
                  <span>Pagado:</span>
                  <span>{formatCurrency(montoPagado)}</span>
                </div>
                <div className="flex justify-between font-bold" style={{ color: 'var(--color-naranja-medio)' }}>
                  <span>Saldo pendiente:</span>
                  <span>{formatCurrency(sale.balanceDue ?? 0)}</span>
                </div>
              </div>
            )}
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
    <div className="receipt-overlay fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="receipt-shell bg-white rounded-lg shadow-2xl max-w-full max-h-full overflow-auto">
        {/* Controls */}
        <div className="sticky top-0 bg-white border-b p-4 flex flex-wrap gap-2 justify-between items-center print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            {type === 'thermal' ? (
              <Button onClick={handlePrint} size="sm" className="bg-[#455a54] text-white hover:bg-[#455a54]/90">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir ticket
              </Button>
            ) : (
              <>
                <Button onClick={handlePrintTicket} size="sm" className="bg-[#455a54] text-white hover:bg-[#455a54]/90">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir ticket
                </Button>
                <Button onClick={handlePrint} variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir A4
                </Button>
              </>
            )}
            <Button
              onClick={handleToggleFormat}
              variant="outline"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              {type === 'thermal' ? 'Ver A4' : 'Ver Térmico'}
            </Button>
            {type === 'thermal' && (
              <label
                className="flex items-center gap-1.5 text-xs text-[#7a6e6f]"
                title="Si lo último queda adentro de la impresora, subilo; si sobra papel, bajalo."
              >
                Avance al final
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={feedMm}
                  onChange={(e) => changeFeed(Number(e.target.value))}
                  className="h-8 w-14 rounded-md border border-[#e6dbcd] px-2 text-xs"
                />
                mm
              </label>
            )}
          </div>
          <Button onClick={type === 'thermal' ? () => window.close() : onClose} variant="outline" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Receipt Content */}
        <div className="receipt-body p-4">
          {type === 'thermal' ? <ThermalReceipt /> : <A4Receipt />}
        </div>
      </div>
    </div>
  );
}