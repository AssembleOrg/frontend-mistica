'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sale } from '@/services/sales.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { useSalesAPI } from '@/hooks/useSalesAPI';
import { useStock } from '@/hooks/useStock';
import { useProducts } from '@/hooks/useProducts';
import { showToast } from '@/lib/toast';
import { processReceiptGeneration, hasAfipData } from '@/lib/receipt-utils';
import { GeneratingPdfDialog } from '@/components/ui/generating-pdf-dialog';
import { IssueCreditNoteDialog } from './issue-credit-note-dialog';
import { IssueInvoiceDialog } from './issue-invoice-dialog';
import { ConfirmCancelDialog } from './confirm-cancel-dialog';
import {
  CheckCircle2,
  XCircle,
  Receipt,
  RotateCcw,
  Banknote,
  CreditCard,
  ArrowDownUp,
  FileText,
  User,
  Calendar,
  Package,
  ShieldCheck,
} from 'lucide-react';

interface SaleDetailContentProps {
  sale: Sale;
  onSaleUpdated?: () => void;
  onRequestEdit?: (sale: Sale) => void;
  stickyActions?: boolean;
}

function PaymentIcon({ method }: { method: string }) {
  if (method === 'CASH') return <Banknote className="h-3.5 w-3.5 text-[#9d684e]" />;
  if (method === 'CARD') return <CreditCard className="h-3.5 w-3.5 text-[#9d684e]" />;
  return <ArrowDownUp className="h-3.5 w-3.5 text-[#9d684e]" />;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
};

const STATUS_CONFIG = {
  COMPLETED: { label: 'Completada', className: 'bg-[#455a54]/10 text-[#455a54] border-[#455a54]/30' },
  PENDING:   { label: 'Pendiente',  className: 'bg-[#cc844a]/10 text-[#cc844a] border-[#cc844a]/30' },
  CANCELLED: { label: 'Cancelada',  className: 'bg-[#4e4247]/10 text-[#4e4247] border-[#4e4247]/30' },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    label: status,
    className: 'bg-[#455a54]/5 text-[#455a54]/60 border-[#455a54]/20',
  };
  return (
    <Badge variant="outline" className={`${cfg.className} font-winter-solid text-xs`}>
      {cfg.label}
    </Badge>
  );
}

// Thin row: label left, value right — macOS inspector style
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-4 max-xl:gap-2">
      <span className="text-xs text-[#455a54]/70 font-winter-solid shrink-0">{label}</span>
      <span className="text-xs text-[#455a54] font-semibold font-winter-solid text-right min-w-0 truncate">{children}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-[#9d684e]" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#455a54]/70 font-winter-solid">
          {title}
        </span>
      </div>
      <div className="bg-[#efcbb9]/50 rounded-lg border border-[#9d684e]/25 px-3 max-xl:px-2.5 divide-y divide-[#9d684e]/15 min-w-0">
        {children}
      </div>
    </div>
  );
}

export function SaleDetailContent({ sale, onSaleUpdated, onRequestEdit, stickyActions }: SaleDetailContentProps) {
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showCreditNote, setShowCreditNote] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { updateSale, getSaleById, deleteSale } = useSalesAPI();
  const { recordSaleMovements } = useStock();
  const { products } = useProducts();

  const isPending   = sale.status === 'PENDING';
  const isCompleted = sale.status === 'COMPLETED';
  const isCancelled = sale.status === 'CANCELLED';
  // Una venta está "facturada" cuando AFIP devolvió CAE. Hasta entonces no
  // tiene sentido emitir nota de crédito (no hay factura que invalidar).
  const isInvoiced  = !!sale.afipCae;

  const handleCompleteSale = async () => {
    if (!isPending) return;
    setIsUpdating(true);
    setIsGeneratingPdf(generateInvoice);
    try {
      const updateData: Record<string, unknown> = { status: 'COMPLETED', shouldInvoice: generateInvoice };
      const updatedSale = await updateSale(sale.id, updateData);
      recordSaleMovements(sale, 'salida', products);
      showToast.success('Venta completada');

      if (generateInvoice) {
        let attempts = 0;
        let saleWithAfip = updatedSale;
        while (attempts < 10 && !hasAfipData(saleWithAfip)) {
          await new Promise(r => setTimeout(r, 1000));
          saleWithAfip = await getSaleById(sale.id);
          attempts++;
        }
        if (hasAfipData(saleWithAfip)) {
          processReceiptGeneration(saleWithAfip, true);
        } else {
          showToast.error('La factura está siendo procesada. Intentá ver el comprobante más tarde.');
        }
      } else {
        processReceiptGeneration(updatedSale, false);
      }
      onSaleUpdated?.();
    } catch {
      showToast.error('Error al completar la venta');
    } finally {
      setIsUpdating(false);
      setIsGeneratingPdf(false);
    }
  };

  const handleCancelSale = async () => {
    setIsUpdating(true);
    try {
      if (isPending) {
        await deleteSale(sale.id);
        showToast.success('Comanda eliminada');
      } else {
        await updateSale(sale.id, { status: 'CANCELLED' });
        recordSaleMovements(sale, 'entrada', products);
        showToast.success('Venta cancelada');
      }
      setShowCancelConfirm(false);
      onSaleUpdated?.();
    } catch {
      showToast.error('Error al procesar la operación');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewReceipt = () => processReceiptGeneration(sale, hasAfipData(sale));

  // Facturar una venta que ya está COMPLETED pero no tiene CAE. Recibe los
  // datos elegidos por el usuario en el IssueInvoiceDialog (tipo, CUIT, etc).
  // Igual que en handleCompleteSale, hacemos polling de los datos de AFIP
  // porque el endpoint puede tardar unos segundos.
  const handleConfirmInvoice = async (data: {
    invoiceType: 'A' | 'B' | 'C';
    cuit?: string;
    taxCondition?: 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL';
    businessName?: string;
    fiscalAddress?: string;
  }) => {
    if (!isCompleted || isInvoiced) return;
    setIsUpdating(true);
    setIsGeneratingPdf(true);
    try {
      await updateSale(sale.id, {
        shouldInvoice: true,
        invoiceType: data.invoiceType,
        invoiceCuit: data.cuit,
        invoiceTaxCondition: data.taxCondition,
        invoiceBusinessName: data.businessName,
        invoiceFiscalAddress: data.fiscalAddress,
      });
      showToast.success('Generando factura AFIP…');

      let attempts = 0;
      let saleWithAfip: Sale = sale;
      while (attempts < 10 && !hasAfipData(saleWithAfip)) {
        await new Promise(r => setTimeout(r, 1000));
        saleWithAfip = await getSaleById(sale.id);
        attempts++;
      }

      if (hasAfipData(saleWithAfip)) {
        showToast.success('Factura emitida');
        processReceiptGeneration(saleWithAfip, true);
      } else {
        showToast.error('La factura está siendo procesada. Intentá ver el comprobante más tarde.');
      }
      onSaleUpdated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al emitir la factura AFIP';
      showToast.error(msg);
    } finally {
      setIsUpdating(false);
      setIsGeneratingPdf(false);
    }
  };

  const formattedDate = new Date(sale.createdAt).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const discountAmount = sale.discount > 0 ? sale.subtotal * (sale.discount / 100) : 0;
  const hasPrepaid    = (sale.prepaidUsed ?? 0) > 0;
  const hasDiscount   = sale.discount > 0;
  const hasTax        = sale.tax > 0;
  const isMultiPay    = (sale.payments ?? []).length > 1;

  return (
    <>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-2 mb-4 max-xl:mb-3 min-w-0">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#455a54]/40 font-winter-solid mb-0.5">
            Venta
          </p>
          <h2 className="text-lg max-xl:text-base font-bold text-[#455a54] font-tan-nimbus leading-none truncate">
            #{sale.saleNumber}
          </h2>
          <p className="text-xs text-[#455a54]/50 font-winter-solid mt-1">{formattedDate}</p>
        </div>
        <StatusBadge status={sale.status} />
      </div>

      {/* ── Body sections ──────────────────────────────── */}
      <div className="space-y-4 max-xl:space-y-3">

        {/* Cliente */}
        <Section title="Cliente" icon={User}>
          <Row label="Nombre">{sale.customerName || '—'}</Row>
          {sale.customerEmail && <Row label="Email">{sale.customerEmail}</Row>}
          {sale.customerPhone && <Row label="Teléfono">{sale.customerPhone}</Row>}
        </Section>

        {/* Productos */}
        <Section title={`Productos · ${sale.items.length}`} icon={Package}>
          {sale.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 gap-2">
              <div className="min-w-0">
                <p className="text-sm text-[#455a54] font-winter-solid truncate font-medium">{item.productName}</p>
                <p className="text-xs text-[#455a54]/60 font-winter-solid mt-0.5">
                  {item.quantity} × {formatCurrency(item.unitPrice)}
                </p>
              </div>
              <span className="text-sm font-semibold text-[#455a54] font-winter-solid shrink-0">
                {formatCurrency(item.subtotal)}
              </span>
            </div>
          ))}
        </Section>

        {/* Pago */}
        <Section title={isMultiPay ? 'Pagos mixtos' : 'Pago'} icon={Banknote}>
          {(sale.payments ?? []).map((p, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <PaymentIcon method={p.method} />
                <span className="text-xs text-[#455a54] font-winter-solid truncate">
                  {PAYMENT_LABELS[p.method] ?? p.method}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-semibold text-[#455a54] font-winter-solid">
                  {formatCurrency(p.amount)}
                </span>
                {p.method === 'CASH' && (p.changeGiven ?? 0) > 0 && (
                  <p className="text-[10px] text-[#455a54]/40 font-winter-solid">
                    vuelto {formatCurrency(p.changeGiven ?? 0)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </Section>

        {/* Totales */}
        <Section title="Resumen" icon={FileText}>
          <Row label="Subtotal">{formatCurrency(sale.subtotal)}</Row>
          {hasDiscount && (
            <Row label={`Descuento ${sale.discount}%`}>
              <span className="text-[#cc844a]">−{formatCurrency(discountAmount)}</span>
            </Row>
          )}
          {hasPrepaid && (
            <Row label="Seña aplicada">
              <span className="text-[#455a54]">−{formatCurrency(sale.prepaidUsed ?? 0)}</span>
            </Row>
          )}
          {hasTax && <Row label="Impuestos">{formatCurrency(sale.tax)}</Row>}
          <div className="flex items-center justify-between py-2 gap-4 max-xl:gap-2">
            <span className="text-xs font-bold text-[#455a54] font-tan-nimbus shrink-0">Total</span>
            <span className="text-base font-bold text-[#9d684e] font-tan-nimbus truncate">
              {formatCurrency(sale.total)}
            </span>
          </div>
        </Section>

        {/* AFIP-HIDDEN: bloque ocultado por pedido del cliente. Reactivar descomentando.
        {hasAfipData(sale) && (
          <Section title="Factura AFIP" icon={ShieldCheck}>
            <Row label="CAE">{sale.afipCae}</Row>
            <Row label="Nº Factura">{String(sale.afipNumero)}</Row>
            {sale.afipFechaVto && (
              <Row label="Vencimiento">
                {new Date(sale.afipFechaVto).toLocaleDateString('es-AR')}
              </Row>
            )}
          </Section>
        )}
        */}

        {/* Notas */}
        {sale.notes && (
          <Section title="Notas" icon={FileText}>
            <p className="text-xs text-[#455a54]/70 font-winter-solid py-2 leading-relaxed">
              {sale.notes}
            </p>
          </Section>
        )}
      </div>

      {/* ── Acciones ───────────────────────────────────── */}
      <div className={`mt-5 space-y-2 ${stickyActions ? 'sticky bottom-0 bg-white pt-2 pb-2 -mx-4 px-4 border-t border-[#d9dadb]' : ''}`}>
        <Separator className={`bg-[#9d684e]/10 mb-3 ${stickyActions ? 'hidden' : ''}`} />

        {isPending && (
          <>
            {/* Completar venta */}
            <div className="bg-white/60 rounded-lg border border-[#9d684e]/10 p-3 space-y-2.5">
              {/* AFIP-HIDDEN: bloque ocultado por pedido del cliente. Reactivar descomentando.
              <div className="flex items-center gap-2">
                <Checkbox
                  id="generateInvoice"
                  checked={generateInvoice}
                  onCheckedChange={(v) => setGenerateInvoice(v === true)}
                  className="data-[state=checked]:bg-[#455a54] data-[state=checked]:border-[#455a54]"
                />
                <Label
                  htmlFor="generateInvoice"
                  className="text-xs text-[#455a54] font-winter-solid cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Emitir factura AFIP
                </Label>
              </div>
              */}
              <Button
                onClick={handleCompleteSale}
                disabled={isUpdating}
                className="w-full bg-[#455a54] hover:bg-[#455a54]/90 text-white text-xs h-8 font-winter-solid"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                {isUpdating ? 'Completando…' : 'Completar venta'}
              </Button>
            </div>

            {/* Editar / Cancelar */}
            <div className="flex gap-2">
              {onRequestEdit && (
                <Button
                  onClick={() => onRequestEdit(sale)}
                  variant="outline"
                  className="flex-1 border-[#9d684e]/30 text-[#455a54] hover:bg-[#9d684e]/8 text-xs h-8 font-winter-solid"
                >
                  Editar
                  <kbd className="hidden xl:inline-flex ml-2 px-1 py-0.5 text-[10px] font-mono bg-[#455a54]/10 border border-[#455a54]/25 rounded leading-none">F3</kbd>
                </Button>
              )}
              <Button
                onClick={() => setShowCancelConfirm(true)}
                disabled={isUpdating}
                variant="outline"
                className="flex-1 border-[#4e4247]/30 text-[#4e4247] hover:bg-[#4e4247]/10 text-xs h-8 font-winter-solid"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Cancelar
              </Button>
            </div>
          </>
        )}

        {isCompleted && (
          <>
            <div className="flex gap-2">
              <Button
                onClick={handleViewReceipt}
                className="flex-1 bg-[#9d684e] hover:bg-[#9d684e]/90 text-white text-xs h-8 font-winter-solid"
              >
                <Receipt className="h-3.5 w-3.5 mr-1.5" />
                Ver comprobante
                <kbd className="hidden xl:inline-flex ml-2 px-1 py-0.5 text-[10px] font-mono bg-white/20 border border-white/40 rounded leading-none">F4</kbd>
              </Button>
              {/* AFIP-HIDDEN: bloque ocultado por pedido del cliente. Reactivar descomentando.
              {isInvoiced && (
                <Button
                  onClick={() => setShowCreditNote(true)}
                  variant="outline"
                  className="border-[#9d684e]/30 text-[#455a54] hover:bg-[#9d684e]/8 text-xs h-8 font-winter-solid"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  NC
                </Button>
              )}
              */}
            </div>

            {/* AFIP-HIDDEN: bloque ocultado por pedido del cliente. Reactivar descomentando.
            {!isInvoiced && (
              <Button
                onClick={() => setShowInvoiceDialog(true)}
                disabled={isUpdating}
                variant="outline"
                className="w-full border-[#455a54]/30 text-[#455a54] hover:bg-[#455a54]/8 text-xs h-8 font-winter-solid"
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                {isUpdating ? 'Facturando…' : 'Facturar AFIP'}
              </Button>
            )}
            */}
          </>
        )}

        {isCancelled && isInvoiced && (
          <Button
            onClick={() => setShowCreditNote(true)}
            variant="outline"
            className="w-full border-[#9d684e]/30 text-[#455a54] hover:bg-[#9d684e]/8 text-xs h-8 font-winter-solid"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Emitir nota de crédito
          </Button>
        )}
      </div>

      <ConfirmCancelDialog
        open={showCancelConfirm}
        onOpenChange={setShowCancelConfirm}
        onConfirm={handleCancelSale}
        isLoading={isUpdating}
        saleNumber={sale.saleNumber}
        isPending={isPending}
      />
      <GeneratingPdfDialog isOpen={isGeneratingPdf} />
      <IssueCreditNoteDialog
        open={showCreditNote}
        onOpenChange={setShowCreditNote}
        sale={sale}
        onIssued={() => onSaleUpdated?.()}
      />
      <IssueInvoiceDialog
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        total={sale.total}
        onConfirm={handleConfirmInvoice}
      />
    </>
  );
}
