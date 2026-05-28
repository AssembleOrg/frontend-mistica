'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banknote, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PaymentsEditor } from './payments-editor';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import { formatCurrency } from '@/lib/sales-calculations';
import { showToast } from '@/lib/toast';
import {
  Sale,
  SalePayment,
  salesService,
} from '@/services/sales.service';

interface AddSalePaymentDialogProps {
  /** Cuando NO es null y `sale.status === 'PARTIAL'` el dialog se abre. */
  sale: Sale | null;
  onOpenChange: (open: boolean) => void;
  /** Se invoca tras un submit exitoso para refrescar el estado del padre. */
  onSuccess: () => void;
}

/**
 * Diálogo para agregar pagos a una venta PARTIAL.
 *
 * - El backend estampa `createdAt = now` en cada pago nuevo: los pagos cuentan
 *   automáticamente para la sesión de caja del día en que se registraron.
 * - Si `Σ nuevos pagos > balanceDue`, el backend rechaza.
 * - Toggle "Marcar como completada": cierra el saldo (status → COMPLETED).
 */
export function AddSalePaymentDialog({
  sale,
  onOpenChange,
  onSuccess,
}: AddSalePaymentDialogProps) {
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [markCompleted, setMarkCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Solo abrir cuando hay venta y es PARTIAL.
  const open = !!sale && sale.status === 'PARTIAL';

  const balanceDue = sale?.balanceDue ?? 0;

  const sumNew = useMemo(
    () => payments.reduce((acc, p) => acc + (p.amount || 0), 0),
    [payments],
  );
  const newBalance = Math.max(0, Number((balanceDue - sumNew).toFixed(2)));

  // Al abrir el dialog, reseteamos el formulario y arrancamos una línea CASH
  // con el saldo sugerido (operador puede sobrescribirlo).
  useEffect(() => {
    if (open) {
      setPayments([{ method: 'CASH', amount: balanceDue }]);
      setMarkCompleted(false);
    } else {
      setPayments([]);
      setMarkCompleted(false);
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sale?.id]);

  const handleSubmit = async () => {
    if (!sale) return;

    if (!(sumNew > 0)) {
      showToast.error('Ingresá al menos un pago');
      return;
    }
    if (sumNew > balanceDue + 0.01) {
      showToast.error('Los pagos exceden el saldo pendiente');
      return;
    }

    setIsSubmitting(true);
    try {
      await salesService.addSalePayments(sale.id, {
        payments: payments.map((p) => ({ method: p.method, amount: p.amount })),
        markCompleted: markCompleted || undefined,
      });
      showToast.success(
        markCompleted ? 'Venta completada' : 'Pago agregado',
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || 'Error al agregar pago';
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sale) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (isSubmitting) return;
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md border-[#9d684e]/20 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-[#9d684e]/10">
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-[#9d684e]" />
            <DialogTitle className="text-base font-bold text-[#455a54] font-tan-nimbus">
              Agregar pago a venta {sale.saleNumber}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-winter-solid text-[#455a54]/70 mt-1">
            Saldo actual:{' '}
            <span
              className="font-semibold"
              style={{ color: 'var(--color-naranja-medio)' }}
            >
              {formatCurrency(balanceDue)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <PaymentsEditor
            total={balanceDue}
            value={payments}
            onChange={setPayments}
            disabled={isSubmitting}
          />

          <div
            className="rounded-md p-2.5 text-sm font-winter-solid border"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--color-naranja-medio) 8%, white)',
              borderColor:
                'color-mix(in srgb, var(--color-naranja-medio) 25%, white)',
              color: 'var(--color-naranja-medio)',
            }}
          >
            <div className="flex items-center justify-between">
              <span>Nuevo saldo:</span>
              <span className="font-semibold">{formatCurrency(newBalance)}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-[#9d684e]/20 bg-white p-2.5">
            <input
              type="checkbox"
              id="markCompleted"
              checked={markCompleted}
              onChange={(e) => setMarkCompleted(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 rounded border-[#9d684e]/40 text-[#455a54] focus:ring-[#455a54]"
            />
            <Label
              htmlFor="markCompleted"
              className="flex-1 cursor-pointer text-sm font-winter-solid text-[#455a54]"
            >
              <div className="font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Marcar venta como completada
              </div>
              <div className="text-[11px] text-[#455a54]/60">
                Cierra el saldo pendiente y deja la venta en estado completada.
              </div>
            </Label>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#9d684e]/10 bg-[#efcbb9]/20">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-8 text-xs font-winter-solid border-[#9d684e]/30 text-[#455a54]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !(sumNew > 0)}
            className="h-8 text-xs font-winter-solid bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-1.5">Agregando…</span>
              </>
            ) : (
              'Agregar pago'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
