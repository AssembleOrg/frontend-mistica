'use client';

import { useState } from 'react';
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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpened?: () => void;
}

export function OpenCashboxDialog({ open, onOpenChange, onOpened }: Props) {
  const { openSession, submitting } = useCashbox();
  const [openingCash, setOpeningCash] = useState(0);
  const [notes, setNotes] = useState('');

  async function handleSubmit() {
    try {
      await openSession({ openingCash, notes: notes || undefined });
      setOpeningCash(0);
      setNotes('');
      onOpenChange(false);
      onOpened?.();
    } catch {
      // toast ya manejado en el hook
    }
  }

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
