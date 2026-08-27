'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet } from 'lucide-react';
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
  onOpened?: () => void;
}

export function OpenCashboxDialog({ open, onOpenChange, onOpened }: Props) {
  const { openSession, submitting } = useCashbox();
  const router = useRouter();
  const [openingCash, setOpeningCash] = useState(0);
  const [notes, setNotes] = useState('');
  // Última caja cerrada: si hubo retiro, lo que quedó en el cajón es lo que
  // deberías estar abriendo hoy. Es un AVISO, no obliga.
  const [last, setLast] = useState<CashSession | null>(null);

  useEffect(() => {
    if (!open) return;
    setLast(null);
    cashboxService
      .getLastClosure()
      .then((res) => setLast(res.data ?? null))
      .catch(() => setLast(null));
  }, [open]);

  async function handleSubmit() {
    try {
      await openSession({ openingCash, notes: notes || undefined });
      setOpeningCash(0);
      setNotes('');
      onOpenChange(false);
      onOpened?.();
    } catch (err: any) {
      if (err?.message === 'PENDING_AUTO_CLOSURE') {
        onOpenChange(false);
        router.push('/dashboard/finances');
      }
      // resto de errores: toast ya manejado en el hook
    }
  }

  const leftInBox = last?.leftInBox;
  const showHint = last != null && leftInBox != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Abrir caja</DialogTitle>
          <DialogDescription>
            Cargá el efectivo inicial con el que arranca el día (para dar
            cambio, etc.). Podés dejarlo en 0 si no hay nada.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-4 py-2'>
          {showHint && (
            <div className='rounded-md border border-[#9d684e]/20 bg-[#efcbb9]/30 p-3 text-sm font-winter-solid space-y-1.5'>
              <p className='flex items-center gap-1.5 font-semibold text-[#455a54]'>
                <Wallet className='h-4 w-4 text-[#9d684e]' />
                Según el último cierre, en la caja hay {formatCurrency(leftInBox)}
              </p>
              <p className='text-xs text-[#455a54]/70'>
                La última caja cerró con {formatCurrency(last.countedClosingCash ?? 0)}
                {(last.withdrawnAmount ?? 0) > 0
                  ? ` y se retiraron ${formatCurrency(last.withdrawnAmount ?? 0)}`
                  : ' sin retiros'}
                . Si el efectivo físico no coincide, contalo y cargá lo real.
              </p>
              {openingCash !== leftInBox && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setOpeningCash(leftInBox)}
                  className='h-7 border-[#9d684e]/30 text-xs text-[#455a54]'
                >
                  Abrir con {formatCurrency(leftInBox)}
                </Button>
              )}
            </div>
          )}
          <div className='space-y-2'>
            <Label>Efectivo inicial</Label>
            <CurrencyInput value={openingCash} onChange={setOpeningCash} placeholder='0,00' />
          </div>
          <div className='space-y-2'>
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Cualquier observación al abrir caja'
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
            disabled={submitting || openingCash < 0}
            className='bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto'
          >
            {submitting ? 'Abriendo…' : 'Abrir caja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
