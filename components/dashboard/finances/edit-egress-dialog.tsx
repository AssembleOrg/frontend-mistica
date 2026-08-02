'use client';

import { useEffect, useState } from 'react';
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
import { EGRESS_TYPES, type EgressType } from '@/lib/egress-type-labels';

interface Props {
  /** Id del egreso a editar. null = diálogo cerrado. */
  egressId: string | null;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

const METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
] as const;

/**
 * Modal para editar un egreso existente. Precarga los datos del egreso vía
 * `getEgressById` y guarda con `updateEgress` (PATCH /egresses/:id). Se abre
 * desde la fila del detalle de sesión SÓLO con la caja abierta: cambiar el
 * monto afecta el efectivo esperado igual que anularlo, y con la caja cerrada
 * ese valor ya quedó persistido en el cierre.
 */
export function EditEgressDialog({ egressId, onOpenChange, onUpdated }: Props) {
  const open = egressId !== null;
  const { getEgressById, updateEgress, isLoading } = useEgressesAPI();

  const [loadingEgress, setLoadingEgress] = useState(false);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState<EgressType>('EXPENSE');
  const [paymentMethod, setPaymentMethod] = useState<typeof METHODS[number]['value']>('CASH');
  const [notes, setNotes] = useState('');

  // Precarga los datos del egreso al abrir. Mientras el fetch está en vuelo el
  // form queda deshabilitado para no guardar valores vacíos.
  useEffect(() => {
    if (!egressId) return;
    let cancelled = false;
    setLoadingEgress(true);
    getEgressById(egressId)
      .then((egress) => {
        if (cancelled) return;
        setConcept(egress.concept ?? '');
        setAmount(egress.amount ?? 0);
        setType((egress.type as EgressType) ?? 'EXPENSE');
        setPaymentMethod(
          (['CASH', 'CARD', 'TRANSFER'].includes(egress.paymentMethod)
            ? egress.paymentMethod
            : 'CASH') as typeof METHODS[number]['value'],
        );
        setNotes(egress.notes ?? '');
      })
      .catch(() => {
        // toast manejado en el hook; cerramos para no dejar un form vacío.
        if (!cancelled) onOpenChange(false);
      })
      .finally(() => {
        if (!cancelled) setLoadingEgress(false);
      });
    return () => {
      cancelled = true;
    };
  }, [egressId, getEgressById, onOpenChange]);

  async function handleSubmit() {
    if (!egressId || !concept.trim() || amount <= 0) return;
    try {
      await updateEgress(egressId, {
        concept: concept.trim(),
        amount,
        type,
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      onUpdated?.();
      onOpenChange(false);
    } catch {
      // toast manejado en el hook
    }
  }

  const busy = isLoading || loadingEgress;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-[95vw] sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Editar egreso</DialogTitle>
          <DialogDescription>
            Corregí el concepto, monto o método. El efectivo esperado de caja se
            recalcula solo.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 py-2'>
          <div className='space-y-1'>
            <Label className='text-xs'>Concepto *</Label>
            <Input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder='Ej: Pago proveedor X'
              disabled={loadingEgress}
            />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div className='space-y-1'>
              <Label className='text-xs'>Monto *</Label>
              <CurrencyInput value={amount} onChange={setAmount} placeholder='0,00' disabled={loadingEgress} />
            </div>
            <div className='space-y-1'>
              <Label className='text-xs'>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as EgressType)} disabled={loadingEgress}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EGRESS_TYPES.map((t) => (
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
              onValueChange={(v) => setPaymentMethod(v as typeof METHODS[number]['value'])}
              disabled={loadingEgress}
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
          <div className='space-y-1'>
            <Label className='text-xs'>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder='Detalles adicionales'
              disabled={loadingEgress}
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
            disabled={busy || !concept.trim() || amount <= 0}
            className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white w-full sm:w-auto'
          >
            {isLoading ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
