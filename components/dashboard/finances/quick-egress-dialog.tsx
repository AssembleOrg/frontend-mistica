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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useEgressesAPI } from '@/hooks/useEgressesAPI';
import { useAuthStore } from '@/stores/auth.store';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const TYPES = [
  { value: 'EXPENSE', label: 'Gasto operativo' },
  { value: 'WITHDRAWAL', label: 'Retiro' },
  { value: 'REFUND', label: 'Devolución' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'OTHER', label: 'Otro' },
] as const;

const METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
] as const;

/**
 * Modal mínimo para registrar un egreso. Usa el endpoint existente de
 * `/egresses`. La idea es darle al operador un atajo desde el dashboard
 * contable sin necesidad de irse a otra pantalla.
 */
export function QuickEgressDialog({ open, onOpenChange, onCreated }: Props) {
  const user = useAuthStore((s) => s.user);
  const { createEgress, isLoading } = useEgressesAPI();

  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState<typeof TYPES[number]['value']>('EXPENSE');
  const [paymentMethod, setPaymentMethod] = useState<typeof METHODS[number]['value']>('CASH');
  const [notes, setNotes] = useState('');
  // false = gasto externo (banco/plata del dueño): cuenta en finanzas pero no
  // baja el efectivo esperado de la caja. Caso típico: sueldos.
  const [affectsCashbox, setAffectsCashbox] = useState(true);

  function reset() {
    setConcept('');
    setAmount(0);
    setType('EXPENSE');
    setPaymentMethod('CASH');
    setNotes('');
    setAffectsCashbox(true);
  }

  async function handleSubmit() {
    if (!concept.trim() || amount <= 0) return;
    try {
      await createEgress({
        concept: concept.trim(),
        amount,
        currency: 'ARS',
        type,
        paymentMethod,
        affectsCashbox,
        notes: notes.trim() || undefined,
        userId: user?.id ?? 'unknown',
      });
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch {
      // toast manejado en el hook
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className='w-[95vw] max-w-[95vw] sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Registrar egreso</DialogTitle>
          <DialogDescription>
            Anotá un gasto, retiro o devolución. Si es CASH, sale del efectivo
            de caja.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 py-2'>
          <div className='space-y-1'>
            <Label className='text-xs'>Concepto *</Label>
            <Input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder='Ej: Pago proveedor X'
            />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <Label className='text-xs'>Monto *</Label>
              <CurrencyInput value={amount} onChange={setAmount} placeholder='0,00' />
            </div>
            <div className='space-y-1'>
              <Label className='text-xs'>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className='space-y-1'>
            <Label className='text-xs'>Método de pago</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {paymentMethod === 'CASH' && (
            <button
              type='button'
              onClick={() => setAffectsCashbox(!affectsCashbox)}
              className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                affectsCashbox
                  ? 'border-[#e6dbcd] bg-white hover:bg-[#fbf5ef]'
                  : 'border-[#9d684e] bg-[#f3e7db]'
              }`}
            >
              <span
                className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border text-[10px] ${
                  affectsCashbox
                    ? 'border-[#c9bfb0] bg-white'
                    : 'border-[#9d684e] bg-[#9d684e] text-white'
                }`}
              >
                {affectsCashbox ? '' : '✓'}
              </span>
              <span className='text-[13px] leading-snug text-[#455a54]'>
                Gasto externo: no sale de la caja física
                <span className='block text-[11px] text-[#7a6e6f]'>
                  Para pagos hechos con plata que no estaba en el cajón (banco,
                  cuenta del dueño). Cuenta en finanzas y reportes, pero no
                  baja el efectivo esperado del arqueo.
                </span>
              </span>
            </button>
          )}
          <div className='space-y-1'>
            <Label className='text-xs'>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder='Detalles adicionales'
            />
          </div>
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
            disabled={isLoading || !concept.trim() || amount <= 0}
            className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white w-full sm:w-auto'
          >
            {isLoading ? 'Registrando…' : 'Registrar egreso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
