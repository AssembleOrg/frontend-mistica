'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
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
import { useCashbox } from '@/hooks/useCashbox';
import { formatCurrency } from '@/lib/sales-calculations';
import { cashboxService, type CashSession } from '@/services/cashbox.service';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CashSession;
  onClosed?: () => void;
}

/**
 * Modal de cierre. El usuario tipea el conteo físico de efectivo. Mostramos
 * el monto inicial; el `expected` lo calcula el backend al cerrar y se ve
 * en el resultado. Si hay diferencia, no bloqueamos: queda registrada.
 */
export function CloseCashboxDialog({ open, onOpenChange, session, onClosed }: Props) {
  const { closeSession, submitting } = useCashbox();
  const [counted, setCounted] = useState(0);
  const [notes, setNotes] = useState('');
  const [expected, setExpected] = useState<number | null>(null);
  const [loadingExpected, setLoadingExpected] = useState(false);

  useEffect(() => {
    if (open) {
      setCounted(0);
      setNotes('');
      setExpected(null);
      setLoadingExpected(true);
      cashboxService
        .getCurrentExpected()
        .then((res) => setExpected(res.data?.expectedClosingCash ?? null))
        .catch(() => setExpected(null))
        .finally(() => setLoadingExpected(false));
    }
  }, [open]);

  // Diferencia informativa entre el conteo del cajero y el esperado.
  // Negativo = falta plata. Positivo = sobra. No bloquea el cierre: el
  // backend la persiste igual como `discrepancy` y queda en el historial.
  const diff = expected === null ? null : Number((counted - expected).toFixed(2));

  let expectedRow: React.ReactNode;
  if (loadingExpected) {
    expectedRow = <span className='text-xs text-[#455a54]/60'>calculando…</span>;
  } else if (expected !== null) {
    expectedRow = <span className='font-semibold'>{formatCurrency(expected)}</span>;
  } else {
    expectedRow = <span className='text-xs text-[#455a54]/60'>—</span>;
  }

  let diffMessage: React.ReactNode;
  if (diff === null || counted <= 0) {
    diffMessage = (
      <p className='text-xs text-[#455a54]/60 flex items-start gap-1'>
        <AlertTriangle className='h-3 w-3 mt-0.5 flex-shrink-0' />
        Lo que tenés ahora en caja en efectivo. La diferencia se calcula automáticamente.
      </p>
    );
  } else if (diff === 0) {
    diffMessage = (
      <p className='text-xs flex items-start gap-1 text-[#455a54]'>
        <CheckCircle2 className='h-3 w-3 mt-0.5 flex-shrink-0' />
        Coincide con lo esperado.
      </p>
    );
  } else {
    const isSurplus = diff > 0;
    diffMessage = (
      <p
        className='text-xs flex items-start gap-1'
        style={{ color: isSurplus ? 'var(--color-naranja-medio)' : 'var(--color-terracota)' }}
      >
        <AlertTriangle className='h-3 w-3 mt-0.5 flex-shrink-0' />
        {isSurplus ? 'Sobrante' : 'Faltante'}: {formatCurrency(Math.abs(diff))} respecto a lo esperado.
      </p>
    );
  }

  async function handleSubmit() {
    try {
      await closeSession({ countedClosingCash: counted, notes: notes || undefined });
      onOpenChange(false);
      onClosed?.();
    } catch {
      // toast manejado en hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogDescription>
            Hacé el conteo físico del efectivo y cargalo. Si hay diferencia con
            lo esperado, igual se cierra y queda registrada.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='rounded-md bg-[#efcbb9]/30 border border-[#9d684e]/20 p-3 text-sm font-winter-solid space-y-1.5'>
            <div className='flex items-center justify-between'>
              <span>Apertura</span>
              <span className='font-semibold'>{formatCurrency(session.openingCash)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span>Esperado al cierre</span>
              {expectedRow}
            </div>
            <div className='text-xs text-[#455a54]/70 pt-1 border-t border-[#9d684e]/15'>
              Abierta: {new Date(session.openedAt).toLocaleString('es-AR')}
            </div>
          </div>

          <div className='space-y-2'>
            <Label>Efectivo contado físicamente</Label>
            <CurrencyInput value={counted} onChange={setCounted} placeholder='0,00' />
            {diffMessage}
          </div>
          <div className='space-y-2'>
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Si falta o sobra, justificá acá'
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className='flex-col-reverse sm:flex-row gap-2'>
          <Button variant='outline' onClick={() => onOpenChange(false)} className='w-full sm:w-auto'>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || counted < 0}
            className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white w-full sm:w-auto'
          >
            {submitting ? 'Cerrando…' : 'Cerrar caja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
