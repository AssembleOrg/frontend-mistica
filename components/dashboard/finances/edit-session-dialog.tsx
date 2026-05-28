'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
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
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cashboxService, type RetroactiveEgressInput } from '@/services/cashbox.service';
import { showToast } from '@/lib/toast';

interface Props {
  sessionId: string | null;
  sessionLabel?: string;
  closedAt?: string;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

type EgressRow = {
  concept: string;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  type: 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER';
  notes: string;
};

const EMPTY_ROW: EgressRow = {
  concept: '',
  amount: 0,
  paymentMethod: 'CASH',
  type: 'EXPENSE',
  notes: '',
};

const TYPE_LABELS: Record<EgressRow['type'], string> = {
  WITHDRAWAL: 'Retiro',
  EXPENSE: 'Gasto operativo',
  REFUND: 'Devolución',
  TRANSFER: 'Transferencia',
  OTHER: 'Otros',
};

const METHOD_LABELS: Record<EgressRow['paymentMethod'], string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
};

/**
 * Editar una sesión CERRADA cargando egresos que no se registraron en el
 * momento. Sólo permitido dentro de las 72hs siguientes al cierre — el botón
 * que dispara este diálogo ya lo controla, y el backend lo valida de nuevo.
 *
 * Cada egreso se persiste con createdAt = session.closedAt, así pertenece a la
 * ventana de esa sesión y el arqueo recalcula esperado+discrepancia.
 */
export function EditSessionDialog({
  sessionId,
  sessionLabel,
  closedAt,
  onOpenChange,
  onSaved,
}: Props) {
  const open = sessionId !== null;
  const [rows, setRows] = useState<EgressRow[]>([{ ...EMPTY_ROW }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRows([{ ...EMPTY_ROW }]);
      setSubmitting(false);
    }
  }, [open]);

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }
  function removeRow(idx: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }
  function patchRow(idx: number, patch: Partial<EgressRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  const validRows = rows.filter((r) => r.concept.trim().length > 0 && r.amount > 0);
  const canSubmit = !submitting && validRows.length > 0;

  async function handleSubmit() {
    if (!sessionId || validRows.length === 0) return;
    setSubmitting(true);
    const payload: RetroactiveEgressInput[] = validRows.map((r) => ({
      concept: r.concept.trim(),
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      type: r.type,
      notes: r.notes.trim() || undefined,
    }));
    try {
      await cashboxService.editSession(sessionId, payload);
      showToast.success(
        `${payload.length} ${payload.length === 1 ? 'egreso cargado' : 'egresos cargados'} en la sesión`,
      );
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'No se pudo editar la sesión';
      showToast.error(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Editar sesión{sessionLabel ? ` · ${sessionLabel}` : ''}</DialogTitle>
          <DialogDescription>
            Cargá egresos que se te pasaron en el momento. Cada egreso queda
            asignado a esta sesión y el arqueo se recalcula automáticamente.
            {closedAt && (
              <span className='block mt-1 text-xs text-[#455a54]/60'>
                Fecha asignada: {new Date(closedAt).toLocaleString('es-AR')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3 py-2'>
          {rows.map((r, i) => (
            <div
              key={i}
              className='rounded-md border border-[#9d684e]/20 bg-[#efcbb9]/15 p-3 space-y-2.5'
            >
              <div className='flex items-center justify-between'>
                <span className='text-xs font-winter-solid text-[#455a54]/70'>
                  Egreso {i + 1}
                </span>
                {rows.length > 1 && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => removeRow(i)}
                    className='h-7 text-[#a0473d] hover:bg-[#a0473d]/10'
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                )}
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Concepto</Label>
                <Input
                  value={r.concept}
                  onChange={(e) => patchRow(i, { concept: e.target.value })}
                  placeholder='Ej. Proveedor X, pago de luz, retiro…'
                  className='h-9'
                />
              </div>

              <div className='grid grid-cols-2 gap-2'>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Monto</Label>
                  <CurrencyInput
                    value={r.amount}
                    onChange={(v) => patchRow(i, { amount: v })}
                    placeholder='0,00'
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label className='text-xs'>Método de pago</Label>
                  <Select
                    value={r.paymentMethod}
                    onValueChange={(v) =>
                      patchRow(i, { paymentMethod: v as EgressRow['paymentMethod'] })
                    }
                  >
                    <SelectTrigger className='h-9'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(METHOD_LABELS) as Array<EgressRow['paymentMethod']>).map(
                        (m) => (
                          <SelectItem key={m} value={m}>
                            {METHOD_LABELS[m]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Tipo</Label>
                <Select
                  value={r.type}
                  onValueChange={(v) => patchRow(i, { type: v as EgressRow['type'] })}
                >
                  <SelectTrigger className='h-9'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as Array<EgressRow['type']>).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-xs'>Notas (opcional)</Label>
                <Textarea
                  value={r.notes}
                  onChange={(e) => patchRow(i, { notes: e.target.value })}
                  rows={2}
                  placeholder='Detalle adicional…'
                  className='text-sm'
                />
              </div>
            </div>
          ))}

          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={addRow}
            className='w-full border-dashed'
          >
            <Plus className='h-3.5 w-3.5 mr-1' /> Agregar otro egreso
          </Button>

          {validRows.length === 0 && (
            <p className='text-xs flex items-start gap-1 text-[#a0473d]'>
              <AlertTriangle className='h-3 w-3 mt-0.5 flex-shrink-0' />
              Completá al menos un egreso con concepto y monto.
            </p>
          )}
        </div>

        <DialogFooter className='flex-col-reverse sm:flex-row gap-2'>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className='w-full sm:w-auto'
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className='bg-[#9d684e] hover:bg-[#9d684e]/90 text-white w-full sm:w-auto'
          >
            {submitting
              ? 'Guardando…'
              : `Guardar ${validRows.length || ''} ${validRows.length === 1 ? 'egreso' : 'egresos'}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
