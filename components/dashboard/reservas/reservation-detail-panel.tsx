'use client';

// Panel lateral de detalle de una reserva (drawer). Fiel al .pen: cabecera con
// código + badge, datos del cliente, experiencia, desglose de montos con el
// saldo destacado, método de seña y acciones. Overlay propio (sin Radix) para
// comportarse como slide-over a la derecha, responsive (full en mobile).

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  KitchenSection,
  ReceiptsSection,
  type ReservationPatch,
} from './reservation-kitchen';
import { useAuth } from '@/hooks/useAuth';
import {
  Ban,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
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
  type AdminExperience,
  type ReservationItem,
  type SpecialEdition,
} from '@/services/reservations.admin.service';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { NewPieceModal } from './piezas-tab';
import { canManageRole } from '@/lib/views';

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
  const [editingPeople, setEditingPeople] = useState(false);
  const [editingExtra, setEditingExtra] = useState(false);
  // Cambios hechos desde la ficha (cocina, tortas, comprobantes): se ven al
  // instante, sin esperar a que el listado se recargue.
  const [patch, setPatch] = useState<ReservationPatch>({});
  const { user } = useAuth();
  // Admin o encargado/a: la gestión operativa.
  const canManage = canManageRole(user?.role);

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
    setEditingPeople(false);
    setEditingExtra(false);
    setPatch({});
  }, [reservation?._id]);

  if (!reservation) return null;
  const r: ReservationItem = { ...reservation, ...patch };
  const applyPatch = (p: ReservationPatch) => {
    setPatch((prev) => ({ ...prev, ...p }));
    onUpdated?.();
  };
  // Editar datos e insertar piezas sólo cuando la cuenta ve los detalles: si
  // vienen recortados (cocina) no hay nombre/contacto ni sentido de editar.
  const canEdit = r.customerName != null;

  const [bg, fg] = RESERVATION_STATUS_COLOR[r.status] ?? ['#f1ede6', '#7a6e6f'];
  const total = r.totalAmount ?? r.amount ?? 0;
  const balance = r.balanceDue;
  // Cobrado = total − saldo: suma la seña y los cobros de saldo posteriores.
  const paid =
    r.paymentMethod === 'COURTESY'
      ? null
      : balance != null
        ? Math.max(0, total - balance)
        : (r.depositAmount ?? null);
  const pct =
    paid != null && total > 0 ? Math.round((paid / total) * 100) : null;

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

          <Section
            title='EXPERIENCIA'
            action={
              canManage && canEdit && r.status === 'CONFIRMED' && !editingPeople && !editingExtra ? (
                <span className='flex items-center gap-3'>
                  <button
                    type='button'
                    onClick={() => setEditingPeople(true)}
                    className='inline-flex items-center gap-1 text-xs font-semibold text-[#9d684e] hover:underline'
                  >
                    <Pencil className='h-3 w-3' /> Personas
                  </button>
                  <button
                    type='button'
                    onClick={() => setEditingExtra(true)}
                    className='inline-flex items-center gap-1 text-xs font-semibold text-[#9d684e] hover:underline'
                  >
                    <Clock className='h-3 w-3' /> Hora extra
                  </button>
                </span>
              ) : undefined
            }
          >
            <KV k='Servicio' v={r.experienceName} />
            {r.specialName && <KV k='Edición especial' v={`✨ ${r.specialName}`} />}
            <KV k='Fecha' v={fmtDateTime(r.startAt)} />
            {editingPeople ? (
              <PeopleEditor
                reservation={r}
                onCancel={() => setEditingPeople(false)}
                onSaved={(p) => {
                  setEditingPeople(false);
                  applyPatch(p);
                }}
              />
            ) : (
              <KV
                k='Personas'
                v={
                  (r.freeSpots ?? 0) > 0
                    ? `${r.quantity} (${r.freeSpots} bonificada${r.freeSpots === 1 ? '' : 's'})`
                    : String(r.quantity)
                }
              />
            )}
            {editingExtra ? (
              <ExtraTimeEditor
                reservation={r}
                onCancel={() => setEditingExtra(false)}
                onSaved={(p) => {
                  setEditingExtra(false);
                  applyPatch(p);
                }}
              />
            ) : (
              (r.extraMinutes ?? 0) > 0 && (
                <KV k='Hora extra' v={`+${extraLabel(r.extraMinutes!)}`} />
              )
            )}
            <KV k='Origen' v={r.source === 'ADMIN' ? 'Panel admin' : 'Landing pública'} />
            {(r.tableCodes?.length ?? 0) > 0 && (
              <KV
                k='Mesas'
                v={r.tableCodes!.join(', ') + (r.sharedTable ? ' · compartida' : '')}
              />
            )}
          </Section>

          <KitchenSection reservation={r} canEdit={canManage} onChanged={applyPatch} />

          {canManage && <ReceiptsSection reservation={r} onChanged={applyPatch} />}

          {canManage && r.specialName && (
            <SpecialExtrasSection reservation={r} onChanged={applyPatch} />
          )}

          <Section title='PAGO'>
            <div className='flex flex-col gap-2.5 rounded-xl bg-[#fbf5ef] p-4'>
              {(r.extras ?? []).map((x, i) => (
                <AmountRow key={i} k={x.label} v={`+ ${fmtPrice(x.amount)}`} />
              ))}
              <AmountRow
                k={(r.extras ?? []).length > 0 ? 'Total (con adicionales)' : 'Total experiencia'}
                v={fmtPrice(total)}
              />
              {paid != null && (
                <AmountRow
                  k={`Cobrado${pct != null ? ` (${pct}%)` : ''}`}
                  v={fmtPrice(paid)}
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
              <span className='text-[13px] text-[#7a6e6f]'>Medio de pago</span>
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

// Sumar o descontar personas (y bonificadas): el total y el saldo se ajustan
// solos; si ya pagaron de más, se avisa.
function PeopleEditor({
  reservation,
  onCancel,
  onSaved,
}: {
  reservation: ReservationItem;
  onCancel: () => void;
  onSaved: (patch: ReservationPatch) => void;
}) {
  const [qty, setQty] = useState(String(reservation.quantity));
  const [free, setFree] = useState(String(reservation.freeSpots ?? 0));
  const [saving, setSaving] = useState(false);
  const quantity = Math.max(1, Math.floor(Number(qty) || 0));
  const freeSpots = Math.min(quantity, Math.max(0, Math.floor(Number(free) || 0)));
  const billable = (q: number, f: number) => Math.max(0, q - Math.min(q, f));
  const courtesy = reservation.paymentMethod === 'COURTESY';
  const diff = courtesy
    ? 0
    : (reservation.unitPrice ?? 0) *
      (billable(quantity, freeSpots) -
        billable(reservation.quantity, reservation.freeSpots ?? 0));
  const changed =
    quantity !== reservation.quantity || freeSpots !== (reservation.freeSpots ?? 0);
  const field =
    'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

  async function save() {
    setSaving(true);
    try {
      const res = await reservationsAdmin.updateReservation(reservation._id, {
        quantity,
        freeSpots,
      });
      showToast.success(`Ahora son ${res.quantity} personas`);
      if ((res.creditDue ?? 0) > 0) {
        showToast.info(`Ya habían pagado ${fmtPrice(res.creditDue!)} de más: queda a favor del cliente.`);
      }
      onSaved({
        quantity: res.quantity,
        freeSpots: res.freeSpots ?? 0,
        totalAmount: res.totalAmount,
        balanceDue: res.balanceDue,
        ...(res.tableCodes ? { tableCodes: res.tableCodes } : {}),
      });
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='flex flex-col gap-2 rounded-xl border border-[#e6dbcd] bg-white p-3'>
      <div className='grid grid-cols-2 gap-2'>
        <label className='flex flex-col gap-1 text-[12px] text-[#7a6e6f]'>
          Personas
          <Input type='number' min={1} value={qty} onChange={(e) => setQty(e.target.value)} className={field} />
        </label>
        <label className='flex flex-col gap-1 text-[12px] text-[#7a6e6f]'>
          Bonificadas
          <Input type='number' min={0} max={quantity} value={free} onChange={(e) => setFree(e.target.value)} className={field} />
        </label>
      </div>
      {changed && diff !== 0 && (
        <p className='text-[12px] text-[#455a54]'>
          {diff > 0 ? `Suma ${fmtPrice(diff)} al total y al saldo.` : `Descuenta ${fmtPrice(-diff)} del total.`}
        </p>
      )}
      <div className='flex gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onCancel}
          className='flex-1 border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
        >
          Cancelar
        </Button>
        <Button type='button' variant='verde' size='sm' onClick={save} disabled={saving || !changed} className='flex-1'>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

/** "1 h", "1 h 30", "30 min". */
function extraLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m}` : `${h} h`;
}

// Sumar, cambiar o quitar la hora extra: alarga la reserva (las mesas quedan
// ocupadas hasta el final) y, si se cobra, va como adicional al saldo.
function ExtraTimeEditor({
  reservation,
  onCancel,
  onSaved,
}: {
  reservation: ReservationItem;
  onCancel: () => void;
  onSaved: (patch: ReservationPatch) => void;
}) {
  const [minutes, setMinutes] = useState(reservation.extraMinutes ?? 0);
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const changed = minutes !== (reservation.extraMinutes ?? 0);
  const field =
    'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

  async function save() {
    setSaving(true);
    try {
      const amount = Math.max(0, Number(price) || 0);
      const res = await reservationsAdmin.updateReservation(reservation._id, {
        extraMinutes: minutes,
        ...(minutes > 0 && amount > 0 ? { extraAmount: amount } : {}),
      });
      showToast.success(minutes > 0 ? `Hora extra: +${extraLabel(minutes)}` : 'Hora extra quitada');
      onSaved({
        extraMinutes: res.extraMinutes ?? 0,
        totalAmount: res.totalAmount,
        balanceDue: res.balanceDue,
        ...(res.extras ? { extras: res.extras } : {}),
        ...(res.tableCodes ? { tableCodes: res.tableCodes } : {}),
      });
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='flex flex-col gap-2 rounded-xl border border-[#e6dbcd] bg-white p-3'>
      <div className='grid grid-cols-2 gap-2'>
        <label className='flex flex-col gap-1 text-[12px] text-[#7a6e6f]'>
          Hora extra
          <select
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className={cn('h-9 rounded-md border px-2 text-sm', field)}
          >
            <option value={0}>Sin hora extra</option>
            <option value={30}>+30 min</option>
            <option value={60}>+1 h</option>
            <option value={90}>+1 h 30</option>
            <option value={120}>+2 h</option>
          </select>
        </label>
        {minutes > 0 && (
          <label className='flex flex-col gap-1 text-[12px] text-[#7a6e6f]'>
            Cobrar (opcional)
            <Input type='number' min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder='0' className={field} />
          </label>
        )}
      </div>
      <p className='text-[11px] text-[#7a6e6f]'>
        Alarga la reserva y deja las mesas ocupadas hasta el final. Lo que cobres se suma al saldo.
      </p>
      <div className='flex gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onCancel}
          className='flex-1 border-[#e6dbcd] text-[#455a54] hover:bg-[#fbf5ef]'
        >
          Cancelar
        </Button>
        <Button type='button' variant='verde' size='sm' onClick={save} disabled={saving || !changed} className='flex-1'>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

// Catálogo de experiencias para ubicar la edición de una reserva. Se pide una
// vez por sesión de la pantalla: cambia poco y lo usan todas las fichas.
let experiencesOnce: Promise<AdminExperience[]> | null = null;
function loadExperiences(): Promise<AdminExperience[]> {
  if (!experiencesOnce) {
    experiencesOnce = reservationsAdmin.listExperiences(true).catch((e) => {
      experiencesOnce = null;
      throw e;
    });
  }
  return experiencesOnce;
}

/**
 * Extras opcionales de la edición especial de la reserva (Halloween…): se
 * suman de un toque. Suben el total y el saldo; no tocan lo ya cobrado.
 */
function SpecialExtrasSection({
  reservation: r,
  onChanged,
}: {
  reservation: ReservationItem;
  onChanged: (p: ReservationPatch) => void;
}) {
  const confirm = useConfirm();
  const [special, setSpecial] = useState<SpecialEdition | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setSpecial(null);
    loadExperiences()
      .then((list) => {
        if (!alive) return;
        const exp = list.find((e) => e._id === r.experienceId);
        const found = (exp?.specials ?? []).find(
          (s) => (r.specialId && s._id === r.specialId) || s.name === r.specialName,
        );
        setSpecial(found ?? null);
      })
      .catch(() => alive && setSpecial(null));
    return () => {
      alive = false;
    };
  }, [r.experienceId, r.specialId, r.specialName]);

  const extras = (special?.extras ?? []).filter((x) => x.name && x.price > 0);
  const included = special?.included ?? [];
  if (extras.length === 0 && included.length === 0) return null;
  const closed = r.status === 'CANCELLED' || r.status === 'EXPIRED';

  async function add(x: { name: string; price: number }) {
    const ok = await confirm({
      title: 'Sumar extra',
      description: `¿Sumar "${x.name}" por ${fmtPrice(x.price)} a la reserva? Sube el total y el saldo a cobrar.`,
      confirmLabel: 'Sumar',
      variant: 'normal',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await reservationsAdmin.addExtra(r._id, { label: x.name, amount: x.price });
      onChanged({
        extras: res.extras,
        totalAmount: res.totalAmount,
        balanceDue: res.balanceDue,
      });
      showToast.success(`${x.name} sumado a la reserva`);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo sumar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title={`EDICIÓN · ${(r.specialName ?? '').toUpperCase()}`}>
      {included.length > 0 && (
        <p className='text-[13px] text-[#3d3338]'>
          <span className='text-[#7a6e6f]'>Incluye: </span>
          {included.join(' · ')}
        </p>
      )}
      {extras.length > 0 && (
        <div className='flex flex-col gap-1.5'>
          <span className='text-[13px] text-[#7a6e6f]'>Extras opcionales</span>
          <div className='flex flex-wrap gap-2'>
            {extras.map((x) => (
              <button
                key={x.name}
                type='button'
                disabled={busy || closed}
                onClick={() => void add(x)}
                title={x.description}
                className='rounded-lg border border-[#e6dbcd] bg-white px-3 py-1.5 text-[13px] font-medium text-[#455a54] hover:bg-[#fbf5ef] disabled:opacity-50'
              >
                + {x.name} · {fmtPrice(x.price)}
              </button>
            ))}
          </div>
        </div>
      )}
    </Section>
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
