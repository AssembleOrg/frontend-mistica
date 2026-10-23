'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { fmtPrice } from '@/lib/reservas-format';
import {
  tallerAdmin,
  type StudentPayment,
} from '@/services/taller.admin.service';
import { StatusBadge } from '../reservas/_shared';
import { currentMonth, fieldCls, monthLabel, shiftMonth } from './monthly-piece';
import { errorText } from '@/lib/api-error-messages';

const fmtDay = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      })
    : '';

const ymdAR = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    : '';

/** Meses para elegir: de 6 atrás a 3 adelante. */
export function monthOptions(around = currentMonth()): string[] {
  return Array.from({ length: 10 }, (_, i) => shiftMonth(around, i - 6)).reverse();
}

type MonthState = {
  period: string;
  payments: StudentPayment[];
  paid: number;
  pending: number;
  /** Estado del mes, de un vistazo. */
  tone: 'ok' | 'partial' | 'pending' | 'overdue' | 'none' | 'skipped';
  label: string;
};

function monthStateOf(period: string, payments: StudentPayment[], now: Date): MonthState {
  const paid = payments.filter((p) => p.status === 'PAID').reduce((a, p) => a + (p.amount || 0), 0);
  const pendings = payments.filter((p) => p.status === 'PENDING');
  const pending = pendings.reduce((a, p) => a + (p.amount || 0), 0);
  const overdue = pendings.find((p) => p.dueDate && new Date(p.dueDate) < now);
  const nextDue = pendings
    .map((p) => p.dueDate)
    .filter(Boolean)
    .sort()[0];
  if (payments.length === 0) {
    return { period, payments, paid, pending, tone: 'none', label: 'Sin cuota cargada' };
  }
  if (overdue) {
    return {
      period,
      payments,
      paid,
      pending,
      tone: 'overdue',
      label: `Vencida el ${fmtDay(overdue.dueDate)}${pending > 0 ? ` · debe ${fmtPrice(pending)}` : ''}`,
    };
  }
  if (pendings.length === 0 && paid === 0 && payments.some((p) => p.status === 'SKIPPED')) {
    return { period, payments, paid, pending, tone: 'skipped', label: 'Mes salteado · no se cobra' };
  }
  if (pendings.length > 0) {
    return {
      period,
      payments,
      paid,
      pending,
      tone: paid > 0 ? 'partial' : 'pending',
      label:
        paid > 0
          ? `Pagó ${fmtPrice(paid)} · falta ${fmtPrice(pending)}${nextDue ? ` (vence ${fmtDay(nextDue)})` : ''}`
          : `A pagar${pending > 0 ? ` ${fmtPrice(pending)}` : ''}${nextDue ? ` · vence ${fmtDay(nextDue)}` : ''}`,
    };
  }
  return { period, payments, paid, pending, tone: 'ok', label: `Pagado ${fmtPrice(paid)}` };
}

const TONE: Record<MonthState['tone'], { bg: string; fg: string; border: string }> = {
  ok: { bg: '#E7F0EC', fg: '#455a54', border: '#c9dcd2' },
  partial: { bg: '#fdf6e3', fg: '#8a6d1a', border: '#efd9a0' },
  pending: { bg: '#fdf6e3', fg: '#8a6d1a', border: '#efd9a0' },
  overdue: { bg: '#fbe4e4', fg: '#a33', border: '#efb9b9' },
  none: { bg: '#f4f1ee', fg: '#7a6e6f', border: '#e6dbcd' },
  skipped: { bg: '#f4f1ee', fg: '#7a6e6f', border: '#e6dbcd' },
};

/**
 * Pagos del alumno ordenados por MES: cada mes con su estado (pagado,
 * parcial, a pagar, vencido) y sus movimientos, que se pueden corregir.
 */
export function PaymentsByMonth({
  payments,
  joinedAt,
  methodLabel,
  onCollect,
  onChanged,
}: Readonly<{
  payments: StudentPayment[];
  joinedAt?: string;
  methodLabel: (m: string) => string;
  onCollect: (p: StudentPayment) => void;
  onChanged: () => void | Promise<void>;
}>) {
  const [editing, setEditing] = useState<StudentPayment | null>(null);
  const confirm = useConfirm();
  const now = new Date();

  // Saltear: el mes no se cobra ni figura vencido (no vino, se reincorpora
  // después, o lo cubre el pago de otro mes). Se puede volver a cobrar.
  async function setSkipped(p: StudentPayment, skip: boolean) {
    if (skip) {
      const ok = await confirm({
        title: `Saltear ${p.period ? monthLabel(p.period).toLowerCase() : 'esta cuota'}`,
        description:
          'No se cobra ni cuenta como vencida. Sirve si ese mes no vino, se reincorpora más adelante o lo paga junto con otro mes. Se puede deshacer con «Volver a cobrar».',
        confirmLabel: 'Saltear',
      });
      if (!ok) return;
    }
    try {
      await tallerAdmin.updatePayment(p._id, { status: skip ? 'SKIPPED' : 'PENDING' });
      showToast.success(skip ? 'Mes salteado' : 'La cuota vuelve a estar a cobrar');
      await onChanged();
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo cambiar'));
    }
  }
  const thisMonth = currentMonth();
  const joinedMonth = joinedAt ? ymdAR(joinedAt).slice(0, 7) : '';

  const byPeriod = new Map<string, StudentPayment[]>();
  const loose: StudentPayment[] = [];
  for (const p of payments) {
    if (p.period) byPeriod.set(p.period, [...(byPeriod.get(p.period) ?? []), p]);
    else loose.push(p);
  }
  // El mes actual siempre se ve (aunque no tenga nada), si ya cursaba.
  if (!byPeriod.has(thisMonth) && (!joinedMonth || joinedMonth <= thisMonth)) {
    byPeriod.set(thisMonth, []);
  }
  const months = [...byPeriod.keys()]
    .sort()
    .reverse()
    .map((period) => monthStateOf(period, byPeriod.get(period)!, now));

  return (
    <div className='flex flex-col gap-2'>
      {months.map((m) => {
        const tone = TONE[m.tone];
        return (
          <div key={m.period} className='overflow-hidden rounded-xl border' style={{ borderColor: tone.border }}>
            <div
              className='flex flex-wrap items-center justify-between gap-2 px-3 py-2'
              style={{ backgroundColor: tone.bg, color: tone.fg }}
            >
              <span className='text-sm font-semibold'>
                {monthLabel(m.period)}
                {m.period === thisMonth && <span className='ml-1.5 text-[11px] font-medium opacity-70'>(este mes)</span>}
              </span>
              <span className='text-[12px] font-semibold'>
                {m.tone === 'ok' ? '✓ ' : m.tone === 'overdue' ? '⚠ ' : m.tone === 'skipped' ? '⤼ ' : ''}
                {m.label}
              </span>
            </div>
            {m.payments.length === 0 ? (
              <p className='px-3 py-2 text-[12px] text-[#7a6e6f]'>
                Sin pagos ni cuota de este mes. Si se le cobró, registralo con «Registrar» eligiendo este mes.
              </p>
            ) : (
              <div className='flex flex-col divide-y divide-[#efe6dc] bg-white'>
                {m.payments.map((p) => (
                  <PaymentLine
                    key={p._id}
                    p={p}
                    now={now}
                    methodLabel={methodLabel}
                    onCollect={() => onCollect(p)}
                    onEdit={() => setEditing(p)}
                    onSkip={(skip) => void setSkipped(p, skip)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      {loose.length > 0 && (
        <div className='overflow-hidden rounded-xl border border-[#e6dbcd]'>
          <div className='bg-[#f4f1ee] px-3 py-2 text-sm font-semibold text-[#7a6e6f]'>
            Sin mes asignado
            <span className='ml-1.5 text-[11px] font-normal'>· tocá ✏️ para decir a qué mes corresponde</span>
          </div>
          <div className='flex flex-col divide-y divide-[#efe6dc] bg-white'>
            {loose.map((p) => (
              <PaymentLine
                key={p._id}
                p={p}
                now={now}
                methodLabel={methodLabel}
                onCollect={() => onCollect(p)}
                onEdit={() => setEditing(p)}
                onSkip={(skip) => void setSkipped(p, skip)}
              />
            ))}
          </div>
        </div>
      )}
      {editing && (
        <EditPaymentDialog
          payment={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await onChanged();
          }}
        />
      )}
    </div>
  );
}

function PaymentLine({
  p,
  now,
  methodLabel,
  onCollect,
  onEdit,
  onSkip,
}: Readonly<{
  p: StudentPayment;
  now: Date;
  methodLabel: (m: string) => string;
  onCollect: () => void;
  onEdit: () => void;
  onSkip: (skip: boolean) => void;
}>) {
  const overdue = p.status === 'PENDING' && p.dueDate && new Date(p.dueDate) < now;
  return (
    <div className='flex flex-wrap items-center gap-2 px-3 py-2 text-[13px] text-[#3d3338]'>
      <span className='font-medium'>{p.concept}</span>
      {p.amount > 0 && <span>{fmtPrice(p.amount)}</span>}
      {p.status === 'PAID' ? (
        <StatusBadge label={`Pagó el ${fmtDay(p.paidAt)}`} bg='#E7F0EC' fg='#455a54' />
      ) : p.status === 'SKIPPED' ? (
        <StatusBadge label='Salteada · no se cobra' bg='#f4f1ee' fg='#7a6e6f' />
      ) : (
        <StatusBadge
          label={overdue ? `VENCIDA ${fmtDay(p.dueDate)}` : `Vence ${fmtDay(p.dueDate)}`}
          bg={overdue ? '#fbe4e4' : '#fdf6e3'}
          fg={overdue ? '#a33' : '#8a6d1a'}
        />
      )}
      {p.method && <span className='text-[#7a6e6f]'>· {methodLabel(p.method)}</span>}
      <span className='ml-auto flex items-center gap-2'>
        {p.status === 'PENDING' && (
          <>
            <button
              type='button'
              onClick={() => onSkip(true)}
              title='No se cobra ni queda vencida (no vino, se reincorpora después, lo paga con otro mes)'
              className='text-[12px] font-medium text-[#7a6e6f] underline hover:opacity-70'
            >
              Saltear mes
            </button>
            <button
              type='button'
              onClick={onCollect}
              className='text-[12px] font-medium text-[#455a54] underline hover:opacity-70'
            >
              Cobrar
            </button>
          </>
        )}
        {p.status === 'SKIPPED' && (
          <button
            type='button'
            onClick={() => onSkip(false)}
            className='text-[12px] font-medium text-[#455a54] underline hover:opacity-70'
          >
            Volver a cobrar
          </button>
        )}
        <button
          type='button'
          onClick={onEdit}
          aria-label='Corregir'
          title='Corregir mes, fecha o monto'
          className='inline-flex size-7 items-center justify-center rounded-md text-[#9d684e] hover:bg-[#fbf5ef]'
        >
          <Pencil className='h-3.5 w-3.5' />
        </button>
      </span>
    </div>
  );
}

/** Corregir un pago o cuota: mes al que aplica, fechas, monto y concepto. */
function EditPaymentDialog({
  payment,
  onClose,
  onSaved,
}: Readonly<{
  payment: StudentPayment;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}>) {
  const confirm = useConfirm();
  const [concept, setConcept] = useState(payment.concept);
  const [amount, setAmount] = useState(String(payment.amount ?? ''));
  const [period, setPeriod] = useState(payment.period ?? '');
  const [paidAt, setPaidAt] = useState(ymdAR(payment.paidAt));
  const [dueDate, setDueDate] = useState(ymdAR(payment.dueDate));
  const [saving, setSaving] = useState(false);
  const paid = payment.status === 'PAID';

  async function save() {
    if (!concept.trim()) return showToast.error('El concepto no puede quedar vacío');
    if (!(Number(amount) >= 0)) return showToast.error('Monto inválido');
    setSaving(true);
    try {
      await tallerAdmin.updatePayment(payment._id, {
        concept: concept.trim(),
        amount: Number(amount),
        ...(period ? { period } : {}),
        ...(paid
          ? paidAt
            ? { paidAt: `${paidAt}T12:00:00-03:00` }
            : {}
          : dueDate
            ? { dueDate: `${dueDate}T23:59:00-03:00` }
            : {}),
      });
      showToast.success('Pago corregido');
      await onSaved();
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo corregir'));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: 'Borrar este registro',
      description: `${payment.concept}${payment.amount ? ` · ${fmtPrice(payment.amount)}` : ''}. No borra la venta de caja (si la hubo).`,
      confirmLabel: 'Borrar',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await tallerAdmin.removePayment(payment._id);
      showToast.success('Registro borrado');
      await onSaved();
    } catch (e) {
      showToast.error(errorText(e, 'No se pudo borrar'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Corregir {paid ? 'pago' : 'cuota'}
          </DialogTitle>
        </DialogHeader>
        <div className='flex flex-col gap-3 text-[13px] text-[#455a54]'>
          <label className='flex flex-col gap-1'>
            Mes al que corresponde
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className={`${fieldCls} h-9 rounded-md border px-2 text-sm`}
            >
              {!period && <option value=''>Sin mes asignado…</option>}
              {[...new Set([...(period ? [period] : []), ...monthOptions()])].sort().reverse().map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className='flex flex-col gap-1'>
            Concepto
            <Input value={concept} onChange={(e) => setConcept(e.target.value)} className={`${fieldCls} h-9`} />
          </label>
          <label className='flex flex-col gap-1'>
            Monto
            <Input
              type='number'
              inputMode='decimal'
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${fieldCls} h-9`}
            />
          </label>
          <label className='flex flex-col gap-1'>
            {paid ? 'Fecha en que pagó' : 'Vence el'}
            <DateInput value={paid ? paidAt : dueDate} onChange={paid ? setPaidAt : setDueDate} />
          </label>
        </div>
        <DialogFooter className='gap-2 sm:justify-between'>
          <Button
            type='button'
            variant='ghost'
            onClick={() => void remove()}
            disabled={saving}
            className='gap-1 text-[#a33] hover:bg-[#fdf3f2]'
          >
            <Trash2 className='h-4 w-4' /> Borrar
          </Button>
          <span className='flex gap-2'>
            <Button type='button' variant='outline' onClick={onClose} className='border-[#e6dbcd] text-[#455a54]'>
              Cancelar
            </Button>
            <Button type='button' variant='verde' onClick={() => void save()} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </span>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
