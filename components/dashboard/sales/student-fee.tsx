'use client';

import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { salesService, type StudentFeeInfo } from '@/services/sales.service';
import { fmtPrice } from '@/lib/reservas-format';
import { currentMonth, monthLabel } from '@/components/dashboard/alumnos/monthly-piece';
import { monthOptions } from '@/components/dashboard/alumnos/student-payments';
/** Línea del carrito (productId ausente en ítems libres). */
type SaleItem = {
  productId?: string;
  productName: string;
  unitPrice?: number;
  price?: number;
  subtotal?: number;
};

/** Qué paga el alumno con la venta (lo elige caja). */
export type FeeKind = 'NONE' | 'MONTH' | 'PARTIAL' | 'CLASSES';

const KIND_LABEL: Record<FeeKind, string> = {
  NONE: 'No es cuota',
  MONTH: 'Cuota del mes',
  PARTIAL: 'Parte del mes (entró a mitad de mes)',
  CLASSES: 'Clases sueltas',
};

/** Líneas que por nombre parecen la cuota ("mes cerámica", "escuelita"…). */
const LOOKS_LIKE_FEE = /\b(mes|cuota|escuelita|mensual)\b/i;

const fmtDay = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      })
    : '';

/**
 * Cuota de alumno en la venta: se marca qué línea del carrito es su cuota y al
 * guardar la venta queda paga su cuota del mes. Si el cliente todavía no es
 * alumno, el backend lo da de alta con sus datos. Las marcadas como cuota en
 * el catálogo o que por nombre lo parecen vienen tildadas.
 */
export function useStudentFee(
  clientId: string | undefined,
  items: SaleItem[],
  flaggedIds: Set<string>,
) {
  const [info, setInfo] = useState<StudentFeeInfo | null>(null);
  // Para qué cliente ya se sabe si es alumno (evita avisar mientras carga).
  const [checkedFor, setCheckedFor] = useState('');
  // Elección manual por producto; sin elección, se usa la sugerencia.
  const [choice, setChoice] = useState<Record<string, boolean>>({});
  // Alumno: qué paga, de qué mes y cuánto ('' = lo sugerido).
  const [kindChoice, setKindChoice] = useState<FeeKind | ''>('');
  const [periodChoice, setPeriodChoice] = useState('');
  const [amountChoice, setAmountChoice] = useState('');

  useEffect(() => {
    setInfo(null);
    if (!clientId) return;
    let alive = true;
    salesService
      .studentFeeOfClient(clientId)
      .then((r) => {
        if (!alive) return;
        setInfo(r);
        setCheckedFor(clientId);
      })
      .catch(() => alive && setInfo(null));
    return () => {
      alive = false;
    };
  }, [clientId]);

  const lines = items.filter(
    (i): i is SaleItem & { productId: string } =>
      !!i.productId && !i.productId.startsWith('free-'),
  );
  type Line = (typeof lines)[number];
  const suggested = (i: Line) =>
    flaggedIds.has(i.productId) || LOOKS_LIKE_FEE.test(i.productName);
  const isOn = (i: Line) => choice[i.productId] ?? suggested(i);
  /** El cliente elegido no es alumno (ninguna ficha de alumno lo tiene). */
  const notStudent = !!clientId && checkedFor === clientId && !info;
  // Ya se sabe qué es el cliente: lo marcado se manda (aunque no sea nada).
  const active = !!info || notStudent;
  const selectedIds = active ? lines.filter(isOn).map((i) => i.productId) : [];

  // Alumno: cualquier línea (también las escritas a mano) que parezca cuota.
  const lineTotal = (i: SaleItem) => i.subtotal ?? i.price ?? i.unitPrice ?? 0;
  const likely = items.filter(
    (i) => (!!i.productId && flaggedIds.has(i.productId)) || LOOKS_LIKE_FEE.test(i.productName),
  );
  const kind: FeeKind = kindChoice || (likely.length > 0 ? 'MONTH' : 'NONE');
  const period = periodChoice || info?.pending[0]?.period || currentMonth();
  const suggestedAmount = (likely.length ? likely : items).reduce((a, i) => a + lineTotal(i), 0);
  const amount = amountChoice !== '' ? Number(amountChoice) : suggestedAmount;
  const payload =
    info && kind !== 'NONE' && amount > 0 ? { kind, period, amount } : undefined;

  return {
    info,
    notStudent,
    active,
    lines,
    selectedIds,
    isOn,
    toggle: (i: Line) => setChoice((c) => ({ ...c, [i.productId]: !isOn(i) })),
    kind,
    period,
    amount,
    amountInput: amountChoice !== '' ? amountChoice : suggestedAmount ? String(suggestedAmount) : '',
    setKind: (k: FeeKind) => setKindChoice(k),
    setPeriod: (p: string) => setPeriodChoice(p),
    setAmount: (v: string) => setAmountChoice(v.replace(/[^\d.]/g, '')),
    /** Cobro de alumno con mes elegido (lo que se manda al guardar). */
    payload,
    reset: () => {
      setChoice({});
      setKindChoice('');
      setPeriodChoice('');
      setAmountChoice('');
    },
  };
}

export type StudentFeeState = ReturnType<typeof useStudentFee>;

export function StudentFeeSection({
  state,
  hasClient,
  clientName,
  cartHasLikelyFee,
}: {
  state: StudentFeeState;
  hasClient: boolean;
  clientName?: string;
  cartHasLikelyFee: boolean;
}) {
  const { info, lines, isOn, toggle, selectedIds, notStudent } = state;

  if (!info) {
    // Sin cliente elegido y con algo que parece cuota: recordarlo.
    if (!hasClient && cartHasLikelyFee) {
      return (
        <p className='rounded-lg border border-[#cc844a]/40 bg-[#F6E9DC] px-3 py-2 text-xs text-[#8a5638]'>
          ¿Es la cuota de un alumno? Elegí el cliente (el alumno) y se le marca
          paga la cuota del mes.
        </p>
      );
    }
    // Parece una cuota y el cliente todavía no es alumno: al cobrar se lo da
    // de alta. Si no es su cuota (p. ej. la paga un familiar), se destilda.
    if (notStudent && cartHasLikelyFee && lines.length > 0) {
      return (
        <div className='flex flex-col gap-2 rounded-lg border border-[#cc844a]/40 bg-[#F6E9DC] p-3 text-[#8a5638]'>
          <p className='flex items-center gap-2 text-sm font-medium'>
            <GraduationCap className='h-4 w-4' />
            {clientName ?? 'El cliente'} todavía no es alumno/a · ¿qué es su cuota?
          </p>
          <FeeLineToggles lines={lines} isOn={isOn} toggle={toggle} />
          <p className='text-xs'>
            {selectedIds.length > 0
              ? 'Al cobrar se lo/la da de alta como alumno/a con sus datos y se le marca paga la cuota del mes. Después asignale su grupo en Alumnos.'
              : 'Ninguna línea marcada: no se da de alta ni se marca ninguna cuota.'}{' '}
            Si es la cuota de otra persona (un hijo/a, por ejemplo), destildala o
            elegí como cliente al alumno/a.
          </p>
        </div>
      );
    }
    return null;
  }
  const { kind, period, amount } = state;
  const ofMonth = info.pending.filter((p) => p.period === period);
  const owed = ofMonth.reduce((a, p) => a + (p.amount || 0), 0);
  const fee = owed || info.monthlyFee || 0;
  const saldo = kind === 'MONTH' && fee > 0 && amount > 0 && amount < fee - 0.01 ? fee - amount : 0;
  const month = monthLabel(period);
  const chip = (on: boolean) =>
    `rounded-md border px-2.5 py-1 text-xs font-medium transition ${
      on
        ? 'border-[#455a54] bg-[#455a54] text-white'
        : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
    }`;
  return (
    <div className='flex flex-col gap-2 rounded-lg border border-[#455a54]/30 bg-[#E7F0EC] p-3 text-[#455a54]'>
      <p className='flex items-center gap-2 text-sm font-medium'>
        <GraduationCap className='h-4 w-4' />
        {info.name} es alumno/a · ¿qué paga con esta venta?
      </p>
      {info.pending.length > 0 && (
        <p className='text-xs'>
          Debe:{' '}
          {info.pending
            .map((p) => `${p.concept}${p.amount ? ` ${fmtPrice(p.amount)}` : ''}${p.dueDate ? ` (vence ${fmtDay(p.dueDate)})` : ''}`)
            .join(' · ')}
        </p>
      )}
      <div className='flex flex-wrap gap-1.5'>
        {(['NONE', 'MONTH', 'PARTIAL', 'CLASSES'] as FeeKind[]).map((k) => (
          <button key={k} type='button' onClick={() => state.setKind(k)} className={chip(kind === k)}>
            {kind === k ? '✓ ' : ''}
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      {kind !== 'NONE' && (
        <div className='flex flex-wrap items-center gap-2 text-xs'>
          <label className='flex items-center gap-1.5'>
            Mes
            <select
              value={period}
              onChange={(e) => state.setPeriod(e.target.value)}
              className='h-8 rounded-md border border-[#e6dbcd] bg-white px-2 text-xs text-[#455a54]'
            >
              {[...new Set([period, ...monthOptions()])].sort().reverse().map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <label className='flex items-center gap-1.5'>
            Monto
            <input
              value={state.amountInput}
              onChange={(e) => state.setAmount(e.target.value)}
              inputMode='decimal'
              className='h-8 w-28 rounded-md border border-[#e6dbcd] bg-white px-2 text-xs text-[#455a54]'
            />
          </label>
        </div>
      )}
      <p className='text-xs'>
        {kind === 'NONE'
          ? 'La venta no toca sus cuotas.'
          : !(amount > 0)
            ? 'Cargá el monto que paga de cuota.'
            : kind === 'MONTH'
              ? `Se registra pagada la cuota de ${month}${saldo > 0 ? `: paga ${fmtPrice(amount)} de ${fmtPrice(fee)} y queda un saldo de ${fmtPrice(saldo)} pendiente` : ''}.`
              : kind === 'PARTIAL'
                ? `${month} queda cerrado con ${fmtPrice(amount)} (no le queda nada pendiente de ese mes). Desde el mes siguiente paga la cuota completa.`
                : `Se registran ${fmtPrice(amount)} de clases sueltas de ${month} (no le queda cuota pendiente de ese mes).`}
      </p>
    </div>
  );
}

/** Las líneas del carrito para tildar cuál es la cuota. */
function FeeLineToggles({
  lines,
  isOn,
  toggle,
}: {
  lines: StudentFeeState['lines'];
  isOn: StudentFeeState['isOn'];
  toggle: StudentFeeState['toggle'];
}) {
  return (
    <div className='flex flex-wrap gap-1.5'>
      {lines.map((i) => {
        const on = isOn(i);
        return (
          <button
            key={i.productId}
            type='button'
            onClick={() => toggle(i)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
              on
                ? 'border-[#455a54] bg-[#455a54] text-white'
                : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
            }`}
          >
            {on ? '✓ ' : ''}
            {i.productName}
          </button>
        );
      })}
    </div>
  );
}
