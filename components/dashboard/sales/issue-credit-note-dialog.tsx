'use client';

import { useEffect, useState } from 'react';
import { Receipt, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { creditNotesService, type CreditNote } from '@/services/credit-notes.service';
import type { Sale } from '@/services/sales.service';
import { formatCurrency } from '@/lib/sales-calculations';
import { showToast } from '@/lib/toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  onIssued?: (cn: CreditNote) => void;
}

/**
 * Modal para emitir NC contra una venta. El monto arranca con el total de la
 * venta como default — el operador puede editarlo (devolución parcial).
 * Si la venta tiene factura AFIP, el backend intenta emitir AFIP también.
 */
export function IssueCreditNoteDialog({ open, onOpenChange, sale, onIssued }: Props) {
  const [amount, setAmount] = useState(sale.total);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(sale.total);
      setReason('');
    }
  }, [open, sale.total]);

  const hasAfipInvoice = !!sale.afipCae;

  async function handleSubmit() {
    if (amount <= 0 || amount > sale.total) {
      showToast.error('El monto debe ser mayor a 0 y no superar el total de la venta');
      return;
    }
    setSubmitting(true);
    try {
      const res = await creditNotesService.issueForSale(sale.id, {
        amount: amount === sale.total ? undefined : amount,
        reason: reason.trim() || undefined,
      });
      const cn = res.data;
      if (cn.status === 'AUTHORIZED') {
        showToast.success(`NC emitida: ${cn.noteNumber} (CAE ${cn.afipCae})`);
      } else if (cn.status === 'INTERNAL') {
        showToast.success(`NC interna emitida: ${cn.noteNumber}`);
      } else {
        showToast.error(`NC creada pero AFIP rechazó: ${cn.afipError ?? 'error'}`);
      }
      onIssued?.(cn);
      onOpenChange(false);
    } catch (err: any) {
      showToast.error(err?.message || 'No se pudo emitir la NC');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Receipt className='h-5 w-5' />
            Emitir nota de crédito
          </DialogTitle>
          <DialogDescription>
            Venta #{sale.saleNumber} · Total {formatCurrency(sale.total)}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 py-2'>
          <div className='space-y-1'>
            <Label className='text-xs'>Monto a acreditar</Label>
            <CurrencyInput value={amount} onChange={setAmount} placeholder='0,00' />
            <p className='text-xs text-[#455a54]/60'>
              Default: total de la venta. Editalo para devolución parcial.
            </p>
          </div>

          <div className='space-y-1'>
            <Label className='text-xs'>Motivo (opcional)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder='Ej: devolución de 1 unidad'
            />
          </div>

          {hasAfipInvoice ? (
            <div className='rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-800 flex items-start gap-1'>
              <AlertCircle className='h-3 w-3 mt-0.5' />
              La venta tiene factura AFIP. Se emitirá NC tipo C asociada (CAE).
            </div>
          ) : (
            <div className='rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 flex items-start gap-1'>
              <AlertCircle className='h-3 w-3 mt-0.5' />
              La venta no tiene factura AFIP. Se registrará NC interna (sin CAE).
            </div>
          )}
        </div>

        <DialogFooter className='flex-col-reverse sm:flex-row gap-2'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='w-full sm:w-auto'
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || amount <= 0 || amount > sale.total}
            className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white w-full sm:w-auto'
          >
            {submitting ? 'Emitiendo…' : 'Emitir NC'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
