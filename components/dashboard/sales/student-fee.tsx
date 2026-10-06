'use client';

import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { salesService, type StudentFeeInfo } from '@/services/sales.service';
import { fmtPrice } from '@/lib/reservas-format';
/** Línea del carrito (productId ausente en ítems libres). */
type SaleItem = { productId?: string; productName: string; unitPrice?: number };

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

  return {
    info,
    notStudent,
    active,
    lines,
    selectedIds,
    isOn,
    toggle: (i: Line) => setChoice((c) => ({ ...c, [i.productId]: !isOn(i) })),
    reset: () => setChoice({}),
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
  if (lines.length === 0) return null;

  const next = info.pending[0];
  // Cobra menos que la cuota: pago parcial, queda el saldo pendiente.
  const price = lines.find(isOn)?.unitPrice ?? 0;
  const fee = next ? next.amount || info.monthlyFee || 0 : info.monthlyFee || 0;
  const saldo = selectedIds.length > 0 && price > 0 && fee > price + 0.01 ? fee - price : 0;
  return (
    <div className='flex flex-col gap-2 rounded-lg border border-[#455a54]/30 bg-[#E7F0EC] p-3 text-[#455a54]'>
      <p className='flex items-center gap-2 text-sm font-medium'>
        <GraduationCap className='h-4 w-4' />
        {info.name} es alumno/a · ¿qué es su cuota?
      </p>
      <FeeLineToggles lines={lines} isOn={isOn} toggle={toggle} />
      <p className='text-xs'>
        {selectedIds.length === 0
          ? 'Ninguna línea marcada: la venta no toca sus cuotas.'
          : next
            ? `Se marca paga: ${next.concept}${next.dueDate ? ` (vence ${fmtDay(next.dueDate)})` : ''}${
                info.pending.length > 1 ? ` · debe ${info.pending.length} cuotas` : ''
              }.`
            : 'No debe cuotas: se registra como adelanto del mes siguiente.'}
        {saldo > 0 &&
          ` Paga ${fmtPrice(price)} de ${fmtPrice(fee)}: queda un saldo de ${fmtPrice(saldo)} pendiente.`}
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
