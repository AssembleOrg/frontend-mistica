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
  /** Se dispara tras cerrar con éxito; sirve para refrescar el estado de caja. */
  onClosed?: () => void;
  /**
   * El usuario, en el paso de éxito, eligió "Cargar egresos / ingresos".
   * El padre usa la sesión cerrada para abrir el EditSessionDialog.
   */
  onLoadMovements?: (closed: CashSession) => void;
}

/**
 * Modal de cierre en dos pasos dentro de la misma ventana:
 *  - `count`: el cajero tipea el conteo físico. El `expected` lo calcula el
 *    backend; la diferencia es informativa y NO bloquea el cierre.
 *  - `done`: confirmación de cierre con resumen. Acá el cajero DECIDE si quiere
 *    cargar egresos/ingresos de esa sesión ahora o simplemente terminar.
 */
export function CloseCashboxDialog({ open, onOpenChange, session, onClosed, onLoadMovements }: Props) {
  const { closeSession, submitting } = useCashbox();
  const [step, setStep] = useState<'count' | 'done'>('count');
  const [counted, setCounted] = useState(0);
  const [notes, setNotes] = useState('');
  const [expected, setExpected] = useState<number | null>(null);
  const [loadingExpected, setLoadingExpected] = useState(false);
  const [closed, setClosed] = useState<CashSession | null>(null);

  useEffect(() => {
    if (open) {
      setStep('count');
      setCounted(0);
      setNotes('');
      setExpected(null);
      setClosed(null);
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
      // OJO: NO llamamos onClosed?.() acá. Ese refresh recarga el estado de
      // caja (current → null) y desmontaría este modal antes de mostrar el
      // paso `done`. Refrescamos recién al cerrar el modal (Listo / Cargar).
      const result = await closeSession({ countedClosingCash: counted, notes: notes || undefined });
      setClosed(result);
      setStep('done');
    } catch {
      // toast manejado en hook
    }
  }

  function handleDone() {
    onOpenChange(false);
    onClosed?.();
  }

  function handleLoadMovements() {
    onOpenChange(false);
    onClosed?.();
    if (closed) onLoadMovements?.(closed);
  }

  if (step === 'done' && closed) {
    const finalDiff = closed.discrepancy ?? 0;
    const isSurplus = finalDiff > 0;
    const isFaltante = finalDiff < 0;
    return (
      // Cerrar con la X / click afuera en este paso equivale a "Listo": cierra
      // y refresca el estado de caja.
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleDone(); }}>
        <DialogContent className='w-[95vw] max-w-[95vw] sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2'>
              <CheckCircle2 className='h-5 w-5 text-green-600' />
              Caja cerrada
            </DialogTitle>
            <DialogDescription>
              La caja se cerró correctamente. ¿Querés cargar egresos o ingresos
              de esta sesión ahora? Podés hacerlo también más tarde desde Finanzas.
            </DialogDescription>
          </DialogHeader>

          <div className='py-2'>
            <div className='rounded-md bg-[#efcbb9]/30 border border-[#9d684e]/20 p-3 text-sm font-winter-solid space-y-1.5'>
              <div className='flex items-center justify-between'>
                <span>Esperado</span>
                <span className='font-semibold'>{formatCurrency(closed.expectedClosingCash ?? 0)}</span>
              </div>
              <div className='flex items-center justify-between'>
                <span>Contado</span>
                <span className='font-semibold'>{formatCurrency(closed.countedClosingCash ?? 0)}</span>
              </div>
              {finalDiff !== 0 && (
                <div
                  className='flex items-center justify-between pt-1 border-t border-[#9d684e]/15'
                  style={{ color: isSurplus ? 'var(--color-naranja-medio)' : 'var(--color-terracota)' }}
                >
                  <span className='flex items-center gap-1'>
                    <AlertTriangle className='h-3.5 w-3.5' />
                    {isSurplus ? 'Sobrante' : 'Faltante'}
                  </span>
                  <span className='font-semibold'>{formatCurrency(Math.abs(finalDiff))}</span>
                </div>
              )}
            </div>
            {isFaltante && (
              <p className='text-xs text-[#455a54]/70 mt-2'>
                Si el faltante se explica por un egreso que no logueaste, cargalo
                ahora para corregir el arqueo.
              </p>
            )}
          </div>

          <DialogFooter className='flex-col-reverse sm:flex-row gap-2'>
            <Button variant='outline' onClick={handleDone} className='w-full sm:w-auto'>
              Listo
            </Button>
            <Button
              onClick={handleLoadMovements}
              className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white w-full sm:w-auto'
            >
              Cargar egresos / ingresos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
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
