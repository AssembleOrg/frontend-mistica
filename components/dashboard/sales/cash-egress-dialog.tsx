'use client';

import { useEffect, useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { LoadingSpinner } from '@/components/ui/loading-skeletons';
import { showToast } from '@/lib/toast';
import {
  cashboxService,
  type CreateCashExpenseRequest,
} from '@/services/cashbox.service';

interface CashEgressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Diálogo para registrar un egreso puntual desde la caja abierta (retiro, pago
 * a proveedor, gasto). El backend stampa createdAt=now y el egreso ya se
 * descuenta del esperado de cierre. Si la caja está cerrada el backend devuelve
 * 409 y mostramos el error. Espejo de CashIncomeDialog.
 */
export function CashEgressDialog({
  open,
  onOpenChange,
  onSuccess,
}: CashEgressDialogProps) {
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setConcept('');
      setAmount(0);
      setNotes('');
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    const trimmedConcept = concept.trim();
    if (!trimmedConcept) {
      showToast.error('Ingresá un concepto');
      return;
    }
    if (!(amount > 0)) {
      showToast.error('El monto debe ser mayor a 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateCashExpenseRequest = {
        concept: trimmedConcept,
        amount,
        paymentMethod: 'CASH',
      };
      if (notes.trim()) payload.notes = notes.trim();
      await cashboxService.createExpense(payload);
      showToast.success('Egreso registrado');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
          'Error al registrar el egreso';
      showToast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <TrendingDown className="h-4 w-4 text-[#9d684e]" />
            <DialogTitle className="text-base font-bold text-[#455a54] font-tan-nimbus">
              Egreso de efectivo de la caja
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-winter-solid text-[#455a54]/70 mt-1">
            Registra plata que sale de la caja sin ser una venta (retiro, pago a
            proveedor, gasto).
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="cash-egress-concept"
              className="text-[#455a54] font-winter-solid"
            >
              Concepto <span className="text-red-500">*</span>
            </Label>
            <Input
              id="cash-egress-concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej. Pago proveedor"
              disabled={isSubmitting}
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="cash-egress-amount"
              className="text-[#455a54] font-winter-solid"
            >
              Monto <span className="text-red-500">*</span>
            </Label>
            <CurrencyInput
              id="cash-egress-amount"
              value={amount}
              onChange={setAmount}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="cash-egress-notes"
              className="text-[#455a54] font-winter-solid"
            >
              Notas <span className="text-[11px] text-[#455a54]/60">(opcional)</span>
            </Label>
            <Textarea
              id="cash-egress-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalle adicional"
              disabled={isSubmitting}
              maxLength={500}
              rows={2}
            />
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
            disabled={isSubmitting || !concept.trim() || !(amount > 0)}
            className="h-8 text-xs font-winter-solid bg-[#9d684e] hover:bg-[#9d684e]/90 text-white"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-1.5">Registrando…</span>
              </>
            ) : (
              'Registrar egreso'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
