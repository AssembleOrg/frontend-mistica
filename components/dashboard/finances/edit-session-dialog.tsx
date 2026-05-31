'use client';

import { useEffect, useState } from 'react';
import { Trash2, AlertTriangle, ArrowDownRight, ArrowUpRight, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
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
import {
  cashboxService,
  type RetroactiveEgressInput,
  type RetroactiveIncomeInput,
} from '@/services/cashbox.service';
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

type IncomeRow = {
  concept: string;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  notes: string;
};

const EMPTY_EGRESS: EgressRow = {
  concept: '',
  amount: 0,
  paymentMethod: 'CASH',
  type: 'EXPENSE',
  notes: '',
};

const EMPTY_INCOME: IncomeRow = {
  concept: '',
  amount: 0,
  paymentMethod: 'CASH',
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
 * Editar una sesión CERRADA cargando egresos y/o ingresos retroactivos
 * (correcciones de saldo, miscelánea). Sólo permitido dentro de las 72hs
 * siguientes al cierre — el botón que dispara este diálogo lo controla,
 * y el backend lo valida de nuevo.
 *
 * Cada movimiento se persiste con createdAt = session.closedAt, así pertenece
 * a la ventana de esa sesión y el arqueo recalcula esperado+discrepancia.
 */
export function EditSessionDialog({
  sessionId,
  sessionLabel,
  closedAt,
  onOpenChange,
  onSaved,
}: Props) {
  const open = sessionId !== null;
  const [egresses, setEgresses] = useState<EgressRow[]>([]);
  const [incomes, setIncomes] = useState<IncomeRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Por default arrancamos con UNA fila de egreso (caso típico). El cajero
      // puede agregar ingresos con el botón si los necesita.
      setEgresses([{ ...EMPTY_EGRESS }]);
      setIncomes([]);
      setSubmitting(false);
    }
  }, [open]);

  function addEgress() {
    setEgresses((prev) => [...prev, { ...EMPTY_EGRESS }]);
  }
  function removeEgress(idx: number) {
    setEgresses((prev) => prev.filter((_, i) => i !== idx));
  }
  function patchEgress(idx: number, patch: Partial<EgressRow>) {
    setEgresses((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addIncome() {
    setIncomes((prev) => [...prev, { ...EMPTY_INCOME }]);
  }
  function removeIncome(idx: number) {
    setIncomes((prev) => prev.filter((_, i) => i !== idx));
  }
  function patchIncome(idx: number, patch: Partial<IncomeRow>) {
    setIncomes((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  const validEgresses = egresses.filter((r) => r.concept.trim().length > 0 && r.amount > 0);
  const validIncomes = incomes.filter((r) => r.concept.trim().length > 0 && r.amount > 0);
  const total = validEgresses.length + validIncomes.length;
  const canSubmit = !submitting && total > 0;

  async function handleSubmit() {
    if (!sessionId || total === 0) return;
    setSubmitting(true);
    const addEgresses: RetroactiveEgressInput[] = validEgresses.map((r) => ({
      concept: r.concept.trim(),
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      type: r.type,
      notes: r.notes.trim() || undefined,
    }));
    const addIncomes: RetroactiveIncomeInput[] = validIncomes.map((r) => ({
      concept: r.concept.trim(),
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      notes: r.notes.trim() || undefined,
    }));
    try {
      await cashboxService.editSession(sessionId, {
        addEgresses: addEgresses.length > 0 ? addEgresses : undefined,
        addIncomes: addIncomes.length > 0 ? addIncomes : undefined,
      });
      const parts: string[] = [];
      if (addEgresses.length > 0) {
        parts.push(`${addEgresses.length} ${addEgresses.length === 1 ? 'egreso' : 'egresos'}`);
      }
      if (addIncomes.length > 0) {
        parts.push(`${addIncomes.length} ${addIncomes.length === 1 ? 'ingreso' : 'ingresos'}`);
      }
      showToast.success(`${parts.join(' y ')} cargado${total === 1 ? '' : 's'} en la sesión`);
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
            Cargá egresos que no logueaste, o ingresos para corregir el conteo
            si tenías más plata de la que contaste. Egresos reducen el
            esperado; ingresos suman al contado. El arqueo se recalcula
            automáticamente.
            {closedAt && (
              <span className='block mt-1 text-xs text-[#455a54]/60'>
                Fecha asignada: {new Date(closedAt).toLocaleString('es-AR')}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5 py-2'>
          {/* === EGRESOS === */}
          <section className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h3 className='flex items-center gap-1.5 text-sm font-winter-solid text-[#455a54]'>
                <ArrowDownRight className='h-4 w-4 text-[#a0473d]' />
                Egresos retroactivos
              </h3>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={addEgress}
                className='h-7 text-xs border-[#a0473d]/30 text-[#a0473d] hover:bg-[#a0473d]/10 hover:text-[#a0473d]'
              >
                <ArrowDownCircle className='h-3.5 w-3.5 mr-1' /> Agregar egreso
              </Button>
            </div>

            {egresses.length === 0 && (
              <p className='text-xs text-[#455a54]/50 italic'>Sin egresos para cargar.</p>
            )}

            {egresses.map((r, i) => (
              <div
                key={`e-${i}`}
                className='rounded-md border border-[#a0473d]/20 bg-[#a0473d]/5 p-3 space-y-2.5'
              >
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-winter-solid text-[#455a54]/70'>
                    Egreso {i + 1}
                  </span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => removeEgress(i)}
                    className='h-7 text-[#a0473d] hover:bg-[#a0473d]/10'
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs'>Concepto</Label>
                  <Input
                    value={r.concept}
                    onChange={(e) => patchEgress(i, { concept: e.target.value })}
                    placeholder='Ej. Proveedor X, pago de luz, retiro…'
                    className='h-9'
                  />
                </div>

                <div className='grid grid-cols-2 gap-2'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>Monto</Label>
                    <CurrencyInput
                      value={r.amount}
                      onChange={(v) => patchEgress(i, { amount: v })}
                      placeholder='0,00'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>Método de pago</Label>
                    <Select
                      value={r.paymentMethod}
                      onValueChange={(v) =>
                        patchEgress(i, { paymentMethod: v as EgressRow['paymentMethod'] })
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
                    onValueChange={(v) => patchEgress(i, { type: v as EgressRow['type'] })}
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
                    onChange={(e) => patchEgress(i, { notes: e.target.value })}
                    rows={2}
                    placeholder='Detalle adicional…'
                    className='text-sm'
                  />
                </div>
              </div>
            ))}
          </section>

          {/* === INGRESOS === */}
          <section className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h3 className='flex items-center gap-1.5 text-sm font-winter-solid text-[#455a54]'>
                <ArrowUpRight className='h-4 w-4 text-[#2f6f3b]' />
                Ingresos / correcciones de saldo
              </h3>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={addIncome}
                className='h-7 text-xs border-[#2f6f3b]/30 text-[#2f6f3b] hover:bg-[#2f6f3b]/10 hover:text-[#2f6f3b]'
              >
                <ArrowUpCircle className='h-3.5 w-3.5 mr-1' /> Agregar ingreso
              </Button>
            </div>

            {incomes.length === 0 && (
              <p className='text-xs text-[#455a54]/50 italic'>
                Sin ingresos para cargar. Si tenías plata en la caja que no contaste al cierre, agregala acá: suma al "contado" y reduce el faltante (o aumenta el sobrante).
              </p>
            )}

            {incomes.map((r, i) => (
              <div
                key={`i-${i}`}
                className='rounded-md border border-[#2f6f3b]/20 bg-[#2f6f3b]/5 p-3 space-y-2.5'
              >
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-winter-solid text-[#455a54]/70'>
                    Ingreso {i + 1}
                  </span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => removeIncome(i)}
                    className='h-7 text-[#a0473d] hover:bg-[#a0473d]/10'
                  >
                    <Trash2 className='h-3.5 w-3.5' />
                  </Button>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-xs'>Concepto</Label>
                  <Input
                    value={r.concept}
                    onChange={(e) => patchIncome(i, { concept: e.target.value })}
                    placeholder='Ej. corrección de saldo, devolución recibida…'
                    className='h-9'
                  />
                </div>

                <div className='grid grid-cols-2 gap-2'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>Monto</Label>
                    <CurrencyInput
                      value={r.amount}
                      onChange={(v) => patchIncome(i, { amount: v })}
                      placeholder='0,00'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>Método</Label>
                    <Select
                      value={r.paymentMethod}
                      onValueChange={(v) =>
                        patchIncome(i, { paymentMethod: v as IncomeRow['paymentMethod'] })
                      }
                    >
                      <SelectTrigger className='h-9'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(METHOD_LABELS) as Array<IncomeRow['paymentMethod']>).map(
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
                  <Label className='text-xs'>Notas (opcional)</Label>
                  <Textarea
                    value={r.notes}
                    onChange={(e) => patchIncome(i, { notes: e.target.value })}
                    rows={2}
                    placeholder='Detalle adicional…'
                    className='text-sm'
                  />
                </div>
              </div>
            ))}
          </section>

          {total === 0 && (
            <p className='text-xs flex items-start gap-1 text-[#a0473d]'>
              <AlertTriangle className='h-3 w-3 mt-0.5 flex-shrink-0' />
              Cargá al menos un egreso o ingreso (con concepto y monto).
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
              : total > 0
                ? `Guardar ${total} movimiento${total === 1 ? '' : 's'}`
                : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
