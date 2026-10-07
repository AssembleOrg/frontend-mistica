'use client';

// Pieza del mes de un alumno: helpers y el editor de campos, compartidos por
// la planilla (Piezas del mes) y la ficha del alumno.

import { useEffect, useState } from 'react';
import { Check, Gift, Loader2, Pencil, Trash2, Undo2, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-section';
import { fmtPrice } from '@/lib/reservas-format';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import {
  tallerAdmin,
  type GroupSlot,
  type MonthlyPiece,
  type MonthlyPieceInput,
} from '@/services/taller.admin.service';
import {
  PieceTypeSelect,
  usePieceCategories,
} from '@/components/dashboard/reservas/piece-type-select';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/** 'YYYY-MM' del mes actual en Argentina. */
export function currentMonth(): string {
  return new Date()
    .toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    .slice(0, 7);
}

export function shiftMonth(ym: string, delta: number): string {
  const y = Number(ym.slice(0, 4));
  const m = Number(ym.slice(5, 7)) - 1 + delta;
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(ym: string): string {
  const m = MESES[Number(ym.slice(5, 7)) - 1] ?? ym;
  return `${m.charAt(0).toUpperCase()}${m.slice(1)} ${ym.slice(0, 4)}`;
}

/** "Martes 18hs" a partir del horario del grupo. */
export function slotLabel(slots: GroupSlot[]): string {
  return slots
    .map((s) => `${DIAS[s.weekday] ?? ''} ${s.start.replace(':00', '')}hs`)
    .join(' · ');
}

const DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Próximas fechas ('YYYY-MM-DD') en que cursa, según los horarios de sus grupos. */
export function nextClassDates(slots: GroupSlot[], count = 6): string[] {
  const days = new Set(slots.map((s) => s.weekday));
  if (!days.size) return [];
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  const d = new Date(`${today}T12:00:00Z`);
  const out: string[] = [];
  for (let i = 0; i < 90 && out.length < count; i++) {
    if (days.has(d.getUTCDay() || 7)) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** "Jue 9/10". */
export function dueLabel(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  return `${DIAS_CORTOS[d.getUTCDay() || 7]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

/**
 * Editor de una pieza del mes. Guarda solo al cambiar cada campo. La pieza se
 * elige del catálogo (el mismo de las fichas): su categoría propone el
 * adicional, que admin/encargado puede bonificar. `compact` = fila de planilla.
 * Sin `value` todavía no existe: el primer cambio la crea (como la pieza del
 * mes, o aparte si es `additional`).
 */
export function MonthlyPieceFields({
  studentId,
  month,
  value,
  additional = false,
  canManage,
  slots = [],
  compact = false,
  doneBy,
  onSaved,
  onRemove,
}: {
  studentId: string;
  month: string;
  value: MonthlyPiece | null;
  /** Otra pieza del mismo mes (no la primera). */
  additional?: boolean;
  canManage: boolean;
  /** Horarios en que cursa: de ahí salen las fechas de "Para". */
  slots?: GroupSlot[];
  compact?: boolean;
  /** Quién hace la gestión (cuentas compartidas). */
  doneBy?: string;
  onSaved?: (p: MonthlyPiece) => void;
  /** Botón para borrarla (o descartarla si todavía no se guardó). */
  onRemove?: () => void;
}) {
  const confirm = useConfirm();
  const categoryOf = usePieceCategories();
  const [name, setName] = useState(value?.pieceName ?? '');
  const [amount, setAmount] = useState(value?.extraAmount != null ? String(value.extraAmount) : '');
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(0);
  const [cobro, setCobro] = useState(false);
  const [editingAmount, setEditingAmount] = useState(false);

  useEffect(() => {
    setName(value?.pieceName ?? '');
    setAmount(value?.extraAmount != null ? String(value.extraAmount) : '');
  }, [value?._id, value?.pieceName, value?.extraAmount]);

  async function save(input: MonthlyPieceInput) {
    setSaving(true);
    try {
      const body = doneBy ? { ...input, doneBy } : input;
      const p = value?._id
        ? await tallerAdmin.updateMonthlyPiece(value._id, body)
        : additional
          ? await tallerAdmin.addMonthlyPiece(studentId, month, body)
          : await tallerAdmin.saveMonthlyPiece(studentId, month, body);
      onSaved?.(p);
      setSavedTick((t) => t + 1);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  // Elegida del catálogo: el backend pone el nombre y, por su categoría, el
  // adicional. Si no está en el catálogo, queda el nombre suelto.
  function pickPiece(picked: string) {
    setName(picked);
    const { type } = categoryOf(picked);
    void save(type ? { pieceTypeId: type.id } : { pieceName: picked, pieceTypeId: '' });
  }

  async function remove() {
    if (!onRemove) return;
    if (value?._id) {
      const ok = await confirm({
        title: 'Borrar pieza',
        description: `Se borra ${value.pieceName ? `"${value.pieceName}"` : 'esta pieza'} de ${monthLabel(month).toLowerCase()}.`,
        confirmLabel: 'Borrar',
      });
      if (!ok) return;
      try {
        await tallerAdmin.removeMonthlyPiece(value._id);
      } catch (e) {
        showToast.error(e instanceof Error ? e.message : 'No se pudo borrar');
        return;
      }
    }
    onRemove();
  }

  const bisque = value?.bisque ?? false;
  const fresh = value?.fresh ?? false;
  const dueDate = value?.dueDate ?? '';
  const dueOptions = nextClassDates(slots);
  if (dueDate && !dueOptions.includes(dueDate)) dueOptions.unshift(dueDate);
  const delivered = value?.delivered ?? false;
  const ready = value?.ready ?? false;
  const extra = value?.extraCharge ?? false;
  const extraAmount = value?.extraAmount ?? 0;
  const waived = value?.waived ?? false;
  const paid = value?.paid ?? false;
  const undoUntil = value?.undoUntil ? new Date(value.undoUntil).getTime() : 0;
  const canUndo = paid && undoUntil > Date.now();

  // Sin pieza elegida no hay nada que marcar (antes se creaban piezas sin
  // nombre). Y mientras guarda, la fila queda quieta: así no salen dos pedidos
  // a la vez que se pisen o dupliquen la pieza.
  const named = !!value?.pieceName;
  const locked = saving || !named;
  const lockTitle = saving ? 'Guardando…' : 'Elegí la pieza primero';

  async function undoPaid() {
    if (!canUndo) {
      showToast.error('Pasaron más de 24 hs del cobro: anulalo desde los pagos del alumno.');
      return;
    }
    const ok = await confirm({
      title: 'Deshacer cobro',
      description: `Se anula el pago "Adicional pieza ${monthLabel(month).toLowerCase()}" del alumno y el adicional vuelve a quedar sin cobrar.`,
      confirmLabel: 'Deshacer cobro',
    });
    if (!ok) return;
    await save({ paid: false });
  }

  async function setDelivered(v: boolean) {
    if (v && canManage && extra && !paid && !waived) {
      const ok = await confirm({
        title: 'Adicional sin cobrar',
        description: `Esta pieza tiene un adicional de ${fmtPrice(extraAmount)} que todavía no se cobró. ¿La entregás igual?`,
        confirmLabel: 'Entregar igual',
      });
      if (!ok) return;
    }
    await save({ delivered: v });
  }

  function commitAmount() {
    setEditingAmount(false);
    const n = Number(amount);
    if (!n) {
      setAmount(extraAmount ? String(extraAmount) : '');
      return;
    }
    if (n !== extraAmount || !extra) void save({ extraCharge: true, extraAmount: n });
  }

  // En la ficha del alumno cada control lleva su título; en la planilla, el
  // título es la columna.
  const labeled = (label: string, node: React.ReactNode) =>
    compact ? node : <FormField label={label}>{node}</FormField>;

  const coccion = (
    <div
      role='radiogroup'
      aria-label='Cocción'
      title={locked ? lockTitle : 'Con una elegida, la otra se apaga'}
      className={cn(
        'inline-flex w-fit rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] p-0.5',
        compact && 'justify-self-center',
        locked && 'opacity-40',
      )}
    >
      {(
        [
          ['fresh', 'Fresca', fresh],
          ['bisque', 'Bizcocho', bisque],
        ] as const
      ).map(([key, label, on]) => (
        <button
          key={key}
          type='button'
          role='radio'
          aria-checked={on}
          disabled={locked}
          onClick={() => void save(key === 'fresh' ? { fresh: !on } : { bisque: !on })}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-medium transition',
            on ? 'bg-[#455a54] text-white' : 'text-[#455a54] hover:bg-white',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // Pedida → Lista → Entregada. Cada paso pide el anterior; se desmarca de
  // atrás para adelante.
  const steps = [
    { label: 'Pedida', done: named },
    {
      label: 'Lista',
      done: ready || delivered,
      onClick: () => void save({ ready: !ready }),
      blocked: delivered ? 'Desmarcá Entregada primero' : null,
    },
    {
      label: 'Entregada',
      done: delivered,
      onClick: () => void setDelivered(!delivered),
      blocked: !ready && !delivered ? 'Primero marcá Lista' : null,
    },
  ];
  const estado = (
    <div
      className={cn('flex items-center gap-1', compact && 'justify-center', locked && 'opacity-40')}
      title={locked ? lockTitle : undefined}
    >
      {steps.map((st, i) => (
        <span key={st.label} className='flex items-center gap-1'>
          {i > 0 && (
            <span className={cn('h-px w-3', st.done ? 'bg-[#455a54]' : 'bg-[#e6dbcd]')} />
          )}
          {st.onClick ? (
            <button
              type='button'
              disabled={locked || !!st.blocked}
              onClick={st.onClick}
              title={st.blocked ?? (st.done ? `Desmarcar ${st.label}` : `Marcar ${st.label}`)}
              aria-pressed={st.done}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition disabled:cursor-not-allowed',
                st.done
                  ? 'border-[#455a54] bg-[#455a54] text-white'
                  : 'border-[#e6dbcd] bg-white text-[#455a54] enabled:hover:border-[#455a54]',
                st.blocked && !st.done && 'opacity-50',
              )}
            >
              {st.done && <Check className='h-3 w-3' />}
              {st.label}
            </button>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                st.done ? 'bg-[#E7F0EC] text-[#455a54]' : 'text-texto-suave',
              )}
            >
              {st.done && <Check className='h-3 w-3' />}
              {st.label}
            </span>
          )}
        </span>
      ))}
    </div>
  );

  // Una sola pastilla dice en qué está la plata del adicional.
  const cobroCell = (
    <div
      className={cn('flex items-center gap-1', compact && 'justify-center', !named && 'opacity-40')}
      title={!named ? 'Elegí la pieza primero' : undefined}
    >
      {paid ? (
        <>
          <span
            className='whitespace-nowrap rounded-full bg-[#E7F0EC] px-2.5 py-1 text-xs font-semibold text-[#455a54]'
            title='Quedó en el historial de pagos del alumno. No pasa por caja.'
          >
            ✓ Cobrado {fmtPrice(extraAmount)}
          </span>
          {canUndo && (
            <IconPill title='Deshacer el cobro (disponible 24 hs)' disabled={saving} onClick={() => void undoPaid()}>
              <Undo2 className='h-3 w-3' />
            </IconPill>
          )}
        </>
      ) : waived ? (
        <>
          <span className='rounded-full bg-[#efe6f2] px-2.5 py-1 text-xs font-semibold text-[#6d5a78]' title='El adicional no se cobra'>
            Bonificada
          </span>
          <IconPill title='Quitar la bonificación (vuelve a cobrarse)' disabled={locked} onClick={() => void save({ waived: false })}>
            <Undo2 className='h-3 w-3' />
          </IconPill>
        </>
      ) : editingAmount ? (
        <Input
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          onBlur={commitAmount}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              setAmount(extraAmount ? String(extraAmount) : '');
              setEditingAmount(false);
            }
          }}
          inputMode='numeric'
          placeholder='$ monto'
          aria-label='Monto del adicional'
          className={cn(fieldCls, 'h-8 w-24 text-sm')}
        />
      ) : extra && extraAmount > 0 ? (
        <>
          <button
            type='button'
            disabled={locked}
            onClick={() => setCobro(true)}
            title='Cobrar el adicional'
            className='whitespace-nowrap rounded-full border border-[#e8b84b] bg-[#fdf6e3] px-2.5 py-1 text-xs font-semibold text-[#8a5a12] transition enabled:hover:bg-[#f9ecc8]'
          >
            Cobrar {fmtPrice(extraAmount)}
          </button>
          <IconPill title='Cambiar el monto' disabled={locked} onClick={() => setEditingAmount(true)}>
            <Pencil className='h-3 w-3' />
          </IconPill>
          <IconPill
            title='Bonificar: no se le cobra (p. ej. por una clase que no pudo recuperar)'
            disabled={locked}
            onClick={() => void save({ waived: true })}
          >
            <Gift className='h-3 w-3' />
          </IconPill>
          <IconPill title='Quitar el adicional' disabled={locked} onClick={() => void save({ extraCharge: false })}>
            <X className='h-3 w-3' />
          </IconPill>
        </>
      ) : (
        <button
          type='button'
          disabled={locked}
          onClick={() => setEditingAmount(true)}
          className='rounded-full px-2 py-1 text-xs font-medium text-texto-suave transition enabled:hover:bg-[#fbf5ef] enabled:hover:text-[#9d684e]'
        >
          + Adicional
        </button>
      )}
    </div>
  );

  return (
    <div className={cn(compact ? 'contents' : 'grid gap-3 sm:grid-cols-2')}>
      <div className={cn('flex min-w-0 flex-col gap-1', !compact && 'sm:col-span-2')}>
        <div className='flex items-center gap-1.5'>
          <PieceTypeSelect
            value={name}
            onChange={pickPiece}
            manage={!compact}
            placeholder={compact ? 'Pieza…' : 'Qué pieza pidió (del catálogo)'}
            className='min-w-0 flex-1'
          />
          {!compact && onRemove && (
            <Button type='button' size='icon' variant='ghost' onClick={() => void remove()} aria-label='Borrar pieza' className='size-9 shrink-0 text-[#a33]'>
              <Trash2 className='h-4 w-4' />
            </Button>
          )}
        </div>
        {value?.category && (
          <span className='truncate text-[11px] text-[#7a6e6f]'>{value.category}</span>
        )}
      </div>
      {labeled(
        'Para cuándo',
        slots.length > 0 ? (
          <select
            value={dueDate}
            disabled={locked}
            onChange={(e) => void save({ dueDate: e.target.value })}
            aria-label='Para cuándo la quiere'
            title={locked ? lockTitle : undefined}
            className={cn(fieldCls, 'h-9 rounded-md border px-2 text-sm disabled:opacity-40')}
          >
            <option value=''>Sin fecha</option>
            {dueOptions.map((d) => (
              <option key={d} value={d}>
                {dueLabel(d)}
              </option>
            ))}
          </select>
        ) : (
          <DatePicker
            value={dueDate}
            onChange={(v) => void save({ dueDate: v })}
            placeholder='Para cuándo'
            disabled={locked}
          />
        ),
      )}
      {labeled('Cocción', coccion)}
      {labeled('Estado', estado)}
      {canManage && labeled('Adicional', cobroCell)}
      {compact && (
        <span className='flex justify-center'>
          {saving ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin text-[#9d684e]' aria-label='Guardando' />
          ) : (
            onRemove &&
            !paid && (
              <button
                type='button'
                onClick={() => void remove()}
                title={value?._id ? 'Borrar esta pieza' : 'Descartar'}
                aria-label='Borrar pieza'
                className='inline-flex size-7 items-center justify-center rounded-md text-[#a33] hover:bg-[#fbe4e4]'
              >
                <Trash2 className='h-3.5 w-3.5' />
              </button>
            )
          )}
        </span>
      )}
      {cobro && (
        <CobroDialog
          amount={extraAmount}
          month={month}
          pieceName={name || value?.pieceName || ''}
          onClose={() => setCobro(false)}
          onConfirm={async (method) => {
            setCobro(false);
            await save({ paid: true, paymentMethod: method });
          }}
        />
      )}
      {!compact && (
        <span className='flex items-center gap-1.5 text-xs text-[#7a6e6f] sm:col-span-2'>
          {saving ? (
            <>
              <Loader2 className='h-3.5 w-3.5 animate-spin' /> Guardando…
            </>
          ) : savedTick > 0 ? (
            <>
              <Check className='h-3.5 w-3.5 text-[#455a54]' /> Guardado
            </>
          ) : (
            'Se guarda solo al cambiar cada campo.'
          )}
        </span>
      )}
    </div>
  );
}

function IconPill({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className='inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[#e6dbcd] bg-white text-[#9d684e] transition enabled:hover:bg-[#fbf5ef] disabled:opacity-40'
    >
      {children}
    </button>
  );
}

// Mismos valores que ventas/caja y los pagos de la ficha del alumno.
const METODOS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'MERCADOPAGO', label: 'Mercado Pago' },
];

/** Confirmación del cobro del adicional: crea el pago del alumno. */
function CobroDialog({
  amount,
  month,
  pieceName,
  onClose,
  onConfirm,
}: {
  amount: number;
  month: string;
  pieceName: string;
  onClose: () => void;
  onConfirm: (method: string) => void | Promise<void>;
}) {
  const [method, setMethod] = useState(METODOS[0].value);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>Cobrar adicional</DialogTitle>
          <DialogDescription>
            Se registra un pago del alumno por <b>{fmtPrice(amount)}</b> con el concepto
            “Adicional pieza {monthLabel(month).toLowerCase()}”{pieceName ? ` (${pieceName})` : ''}. Se puede
            deshacer durante 24 hs.
          </DialogDescription>
        </DialogHeader>
        <p className='rounded-lg border border-[#e8b84b] bg-[#fdf6e3] px-3 py-2 text-xs text-[#5b512f]'>
          Queda en el historial de pagos del alumno. <b>No pasa por caja</b>: si lo cobrás en efectivo,
          no aparece en el arqueo.
        </p>
        <div className='flex flex-col gap-1.5'>
          <span className='text-[13px] font-medium text-[#455a54]'>Cómo se cobró</span>
          <div className='grid grid-cols-2 gap-2'>
            {METODOS.map((m) => (
              <button
                key={m.value}
                type='button'
                onClick={() => setMethod(m.value)}
                aria-pressed={method === m.value}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  method === m.value
                    ? 'border-[#455a54] bg-[#455a54] text-white'
                    : 'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] hover:bg-[#f3e9df]',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type='button' variant='outline' onClick={onClose} className='border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54]'>
            Cancelar
          </Button>
          <Button type='button' variant='verde' onClick={() => void onConfirm(method)}>
            Registrar cobro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
