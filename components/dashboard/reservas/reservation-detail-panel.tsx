'use client';

// Panel lateral de detalle de una reserva (drawer). Fiel al .pen: cabecera con
// código + badge, datos del cliente, experiencia, desglose de montos con el
// saldo destacado, método de seña y acciones. Overlay propio (sin Radix) para
// comportarse como slide-over a la derecha, responsive (full en mobile).

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DietaryTags } from './dietary-badge';
import {
  Ban,
  Building2,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Flame,
  Landmark,
  Pencil,
  Wallet,
  X,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fmtDateTime,
  fmtPrice,
  prettyCode,
  RESERVATION_STATUS_COLOR,
  RESERVATION_STATUS_LABEL,
} from '@/lib/reservas-format';
import { StatusBadge } from './_shared';
import {
  reservationsAdmin,
  type ReservationItem,
} from '@/services/reservations.admin.service';
import { NewPieceModal } from './piezas-tab';

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
  onUpdated,
  busy,
}: {
  reservation: ReservationItem | null;
  onClose: () => void;
  onCollect: (r: ReservationItem) => void;
  onReschedule: (r: ReservationItem) => void;
  onConfirm: (r: ReservationItem) => void;
  onCancel: (r: ReservationItem) => void;
  /** Se llama tras editar el cliente o cargar piezas, para refrescar la lista. */
  onUpdated?: () => void;
  busy?: boolean;
}) {
  const [loadPieces, setLoadPieces] = useState(false);
  const [editingClient, setEditingClient] = useState(false);

  useEffect(() => {
    if (!reservation) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // Bloquear el scroll del fondo mientras el panel está abierto: sin esto, en
    // mobile el gesto de scroll movía la página de atrás en vez del panel.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [reservation, onClose]);

  // Al cambiar de reserva, cerrar cualquier modo/modal abierto.
  useEffect(() => {
    setLoadPieces(false);
    setEditingClient(false);
  }, [reservation?._id]);

  if (!reservation) return null;
  const r = reservation;
  // Editar datos e insertar piezas sólo cuando la cuenta ve los detalles: si
  // vienen recortados (cocina) no hay nombre/contacto ni sentido de editar.
  const canEdit = r.customerName != null;

  const [bg, fg] = RESERVATION_STATUS_COLOR[r.status] ?? ['#f1ede6', '#7a6e6f'];
  const total = r.totalAmount ?? r.amount ?? 0;
  const deposit = r.depositAmount;
  const balance = r.balanceDue;
  const pct =
    deposit != null && total > 0 ? Math.round((deposit / total) * 100) : null;

  const canConfirm = r.status === 'NEEDS_REVIEW';
  const canCollect = balance != null && balance > 0 && r.status === 'CONFIRMED';
  const canReschedule = r.status === 'CONFIRMED';
  const canCancel = ['PENDING', 'CONFIRMED', 'NEEDS_REVIEW'].includes(r.status);

  // Portal al body: así queda ENCIMA de cualquier Dialog abierto (misma z,
  // pero más al final del DOM). `pointer-events-auto` porque Radix deja el
  // body con pointer-events:none mientras un Dialog modal está abierto.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className='pointer-events-auto fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end'>
      <div
        className='animate-in fade-in-0 absolute inset-0 bg-[#3d3338]/30 backdrop-blur-[1px] duration-200'
        onClick={onClose}
      />
      {/* Mobile: sube desde abajo como bottom-sheet (100dvh-aware + safe-area).
          Desktop: slide-over desde la derecha. */}
      <aside className='animate-in slide-in-from-bottom sm:slide-in-from-right relative flex max-h-[92dvh] w-full max-w-full flex-col overflow-y-auto overscroll-contain rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl duration-300 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:pb-0'>
        {/* Grab-handle sólo en mobile (afordancia de gesto del sheet). */}
        <div className='flex shrink-0 justify-center pt-2.5 sm:hidden'>
          <span className='h-1 w-9 rounded-full bg-[#e6dbcd]' />
        </div>
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

          <Section
            title='CLIENTE'
            action={
              canEdit && !editingClient ? (
                <button
                  type='button'
                  onClick={() => setEditingClient(true)}
                  className='inline-flex items-center gap-1 text-xs font-semibold text-[#9d684e] hover:underline'
                >
                  <Pencil className='h-3 w-3' /> Editar
                </button>
              ) : undefined
            }
          >
            {editingClient ? (
              <ClientEditor
                reservation={r}
                onCancel={() => setEditingClient(false)}
                onSaved={() => {
                  setEditingClient(false);
                  onUpdated?.();
                }}
              />
            ) : (
              <>
                <KV k='Nombre' v={r.customerName ?? '—'} />
                {r.customerPhone && <KV k='Teléfono' v={r.customerPhone} />}
                {r.customerEmail && <KV k='Email' v={r.customerEmail} />}
                {r.notes && <KV k='Notas' v={r.notes} />}
              </>
            )}
          </Section>

          <Section title='EXPERIENCIA'>
            <KV k='Servicio' v={r.experienceName} />
            <KV k='Fecha' v={fmtDateTime(r.startAt)} />
            <KV k='Personas' v={String(r.quantity)} />
            <KV k='Origen' v={r.source === 'ADMIN' ? 'Panel admin' : 'Landing pública'} />
            {(r.tableCodes?.length ?? 0) > 0 && (
              <KV
                k='Mesas'
                v={r.tableCodes!.join(', ') + (r.sharedTable ? ' · compartida' : '')}
              />
            )}
          </Section>

          {((r.dietaryTags?.length ?? 0) > 0 || r.dietaryNotes) && (
            <Section title='RESTRICCIONES ALIMENTARIAS'>
              <DietaryTags tags={r.dietaryTags} notes={r.dietaryNotes} />
            </Section>
          )}

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

          {canEdit && (
            <>
              <div className='h-px w-full bg-[#e6dbcd]' />
              <button
                type='button'
                onClick={() => setLoadPieces(true)}
                className='inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#e6dbcd] bg-white px-4 py-3 text-[15px] font-semibold text-[#9d684e] transition-colors hover:bg-[#fbf5ef]'
              >
                <Flame className='h-[17px] w-[17px]' />
                Cargar piezas de esta reserva
              </button>
            </>
          )}

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

      {loadPieces && (
        <NewPieceModal
          reservation={r}
          onClose={() => setLoadPieces(false)}
          onDone={() => {
            setLoadPieces(false);
            onUpdated?.();
          }}
        />
      )}
    </div>,
    document.body,
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-col gap-2.5'>
      <div className='flex items-center justify-between gap-2'>
        <span className='font-mono text-[11px] font-medium tracking-wider text-[#7a6e6f]'>
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

// Edición inline del cliente dentro de la ficha (patrón "abrir → editar sin
// salir"). Guarda con PATCH /admin/reservations/:id (updateReservation).
function ClientEditor({
  reservation,
  onCancel,
  onSaved,
}: {
  reservation: ReservationItem;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(reservation.customerName ?? '');
  const [phone, setPhone] = useState(reservation.customerPhone ?? '');
  const [email, setEmail] = useState(reservation.customerEmail ?? '');
  const [notes, setNotes] = useState(reservation.notes ?? '');
  const [saving, setSaving] = useState(false);

  const field =
    'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

  async function save() {
    if (name.trim().length < 2) {
      showToast.error('Ingresá el nombre del cliente');
      return;
    }
    setSaving(true);
    try {
      await reservationsAdmin.updateReservation(reservation._id, {
        customerName: name.trim(),
        customerPhone: phone.trim() || undefined,
        customerEmail: email.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      showToast.success('Datos actualizados');
      onSaved();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='flex flex-col gap-2'>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='Nombre y apellido' className={field} />
      <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder='Teléfono' className={field} />
      <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Email' className={field} />
      <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder='Notas internas' className={field} />
      <div className='mt-1 flex gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onCancel}
          className='flex-1 border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
        >
          Cancelar
        </Button>
        <Button type='button' variant='verde' size='sm' onClick={save} disabled={saving} className='flex-1'>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
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
