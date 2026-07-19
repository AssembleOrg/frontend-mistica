'use client';

// Panel lateral de detalle de una reserva (drawer). Fiel al .pen: cabecera con
// código + badge, datos del cliente, experiencia, desglose de montos con el
// saldo destacado, método de seña y acciones. Overlay propio (sin Radix) para
// comportarse como slide-over a la derecha, responsive (full en mobile).

import { useEffect } from 'react';
import {
  Ban,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Landmark,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fmtDateTime,
  fmtPrice,
  prettyCode,
  RESERVATION_STATUS_COLOR,
  RESERVATION_STATUS_LABEL,
} from '@/lib/reservas-format';
import { StatusBadge } from './_shared';
import type { ReservationItem } from '@/services/reservations.admin.service';

const PAYMENT_LABEL: Record<string, string> = {
  MERCADOPAGO: 'MercadoPago',
  TRANSFER: 'Transferencia',
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  COURTESY: 'Cortesía',
};

function PaymentIcon({ method }: { method: string }) {
  const cls = 'h-3.5 w-3.5 text-[#455a54]';
  if (method === 'TRANSFER') return <Building2 className={cls} />;
  if (method === 'CARD') return <CreditCard className={cls} />;
  if (method === 'CASH') return <Landmark className={cls} />;
  return <Wallet className={cls} />;
}

export function ReservationDetailPanel({
  reservation,
  onClose,
  onCollect,
  onReschedule,
  onConfirm,
  onCancel,
  busy,
}: {
  reservation: ReservationItem | null;
  onClose: () => void;
  onCollect: (r: ReservationItem) => void;
  onReschedule: (r: ReservationItem) => void;
  onConfirm: (r: ReservationItem) => void;
  onCancel: (r: ReservationItem) => void;
  busy?: boolean;
}) {
  useEffect(() => {
    if (!reservation) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reservation, onClose]);

  if (!reservation) return null;
  const r = reservation;

  const [bg, fg] = RESERVATION_STATUS_COLOR[r.status] ?? ['#f1ede6', '#7a6e6f'];
  const total = r.totalAmount ?? r.amount;
  const deposit = r.depositAmount;
  const balance = r.balanceDue;
  const pct =
    deposit != null && total > 0 ? Math.round((deposit / total) * 100) : null;

  const canConfirm = r.status === 'NEEDS_REVIEW';
  const canCollect = balance != null && balance > 0 && r.status === 'CONFIRMED';
  const canReschedule = r.status === 'CONFIRMED';
  const canCancel = ['PENDING', 'CONFIRMED', 'NEEDS_REVIEW'].includes(r.status);

  return (
    <div className='fixed inset-0 z-50 flex justify-end'>
      <div
        className='absolute inset-0 bg-[#3d3338]/30 backdrop-blur-[1px]'
        onClick={onClose}
      />
      <aside className='relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl'>
        <div className='flex flex-col gap-5 p-6'>
          {/* Cabecera */}
          <div className='flex items-start justify-between'>
            <div className='flex flex-col gap-1.5'>
              <span className='font-mono text-[22px] font-semibold text-[#9d684e]'>
                {prettyCode(r.code)}
              </span>
              <StatusBadge
                label={RESERVATION_STATUS_LABEL[r.status] ?? r.status}
                bg={bg}
                fg={fg}
              />
            </div>
            <button
              type='button'
              onClick={onClose}
              className='inline-flex size-[34px] items-center justify-center rounded-[9px] border border-[#e6dbcd] bg-[#fbf5ef] text-[#7a6e6f] hover:bg-[#f3e9df]'
              aria-label='Cerrar'
            >
              <X className='h-4 w-4' />
            </button>
          </div>

          <Section title='CLIENTE'>
            <KV k='Nombre' v={r.customerName} />
            {r.customerPhone && <KV k='Teléfono' v={r.customerPhone} />}
            {r.customerEmail && <KV k='Email' v={r.customerEmail} />}
          </Section>

          <Section title='EXPERIENCIA'>
            <KV k='Servicio' v={r.experienceName} />
            <KV k='Fecha' v={fmtDateTime(r.startAt)} />
            <KV k='Personas' v={String(r.quantity)} />
            <KV k='Origen' v={r.source === 'ADMIN' ? 'Panel admin' : 'Landing pública'} />
          </Section>

          <Section title='PAGO'>
            <div className='flex flex-col gap-2.5 rounded-xl bg-[#fbf5ef] p-4'>
              <AmountRow k='Total experiencia' v={fmtPrice(total)} />
              {deposit != null && (
                <AmountRow
                  k={`Seña pagada${pct != null ? ` (${pct}%)` : ''}`}
                  v={fmtPrice(deposit)}
                  vColor='#455a54'
                />
              )}
              {balance != null && balance > 0 && (
                <>
                  <div className='h-px w-full bg-[#e6dbcd]' />
                  <div className='flex items-center justify-between'>
                    <span className='text-sm text-[#3d3338]'>Saldo pendiente</span>
                    <span className='text-lg font-semibold text-[#9d684e]'>
                      {fmtPrice(balance)}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className='mt-2.5 flex items-center justify-between'>
              <span className='text-[13px] text-[#7a6e6f]'>Método de seña</span>
              <span className='inline-flex items-center gap-1.5 rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] px-2.5 py-1'>
                <PaymentIcon method={r.paymentMethod} />
                <span className='text-[13px] font-medium text-[#3d3338]'>
                  {PAYMENT_LABEL[r.paymentMethod] ?? r.paymentMethod}
                </span>
              </span>
            </div>
          </Section>

          {(canConfirm || canCollect || canReschedule || canCancel) && (
            <>
              <div className='h-px w-full bg-[#e6dbcd]' />
              <div className='flex flex-col gap-2.5'>
                {canCollect && (
                  <button
                    type='button'
                    disabled={busy}
                    onClick={() => onCollect(r)}
                    className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9d684e] px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#b17e65] disabled:opacity-60'
                  >
                    <Wallet className='h-[17px] w-[17px]' />
                    Cobrar saldo
                  </button>
                )}
                {canConfirm && (
                  <button
                    type='button'
                    disabled={busy}
                    onClick={() => onConfirm(r)}
                    className='inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#455a54] px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#5a746c] disabled:opacity-60'
                  >
                    <CheckCircle2 className='h-[17px] w-[17px]' />
                    Confirmar reserva
                  </button>
                )}
                <div className='flex gap-2.5'>
                  {canReschedule && (
                    <SecondaryBtn
                      icon={CalendarClock}
                      label='Reprogramar'
                      color='#455a54'
                      disabled={busy}
                      onClick={() => onReschedule(r)}
                    />
                  )}
                  {canCancel && (
                    <SecondaryBtn
                      icon={Ban}
                      label='Cancelar'
                      color='#b23b2e'
                      disabled={busy}
                      onClick={() => onCancel(r)}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='flex flex-col gap-2.5'>
      <span className='font-mono text-[11px] font-medium tracking-wider text-[#7a6e6f]'>
        {title}
      </span>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <span className='shrink-0 text-[13px] text-[#7a6e6f]'>{k}</span>
      <span className='truncate text-right text-sm font-medium text-[#3d3338]'>{v}</span>
    </div>
  );
}

function AmountRow({ k, v, vColor }: { k: string; v: string; vColor?: string }) {
  return (
    <div className='flex items-center justify-between'>
      <span className='text-[13px] text-[#7a6e6f]'>{k}</span>
      <span className='text-sm font-semibold' style={{ color: vColor ?? '#3d3338' }}>
        {v}
      </span>
    </div>
  );
}

function SecondaryBtn({
  icon: Icon,
  label,
  color,
  onClick,
  disabled,
}: {
  icon: typeof Ban;
  label: string;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#e6dbcd] bg-white px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-[#fbf5ef] disabled:opacity-60',
      )}
      style={{ color }}
    >
      <Icon className='h-4 w-4' />
      {label}
    </button>
  );
}
