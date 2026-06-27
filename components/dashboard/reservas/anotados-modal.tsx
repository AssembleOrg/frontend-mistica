'use client';

import { useCallback, useEffect, useState } from 'react';
import { Minus, Plus, UserPlus, X } from 'lucide-react';
import { showToast } from '@/lib/toast';
import {
  fmtDateTime,
  fmtPrice,
  prettyCode,
  RESERVATION_STATUS_LABEL,
} from '@/lib/reservas-format';
import {
  reservationsAdmin,
  type AdminSession,
  type ReservationItem,
  type ReservationPaymentMethod,
} from '@/services/reservations.admin.service';

const METHODS: { key: ReservationPaymentMethod; label: string }[] = [
  { key: 'CASH', label: 'Efectivo' },
  { key: 'TRANSFER', label: 'Transfer.' },
  { key: 'COURTESY', label: 'Cortesía' },
];

export function AnotadosModal({
  sessionId,
  onClose,
  onChanged,
}: {
  sessionId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [qty, setQty] = useState(1);
  const [method, setMethod] = useState<ReservationPaymentMethod>('CASH');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reservationsAdmin.attendees(sessionId);
      setSession(data.session);
      setReservations(data.reservations);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const maxQty = session ? Math.max(1, session.seatsAvailable) : 1;
  const isCourtesy = method === 'COURTESY';
  const total = session && !isCourtesy ? session.price * qty : 0;

  async function create() {
    if (!session) return;
    if (name.trim().length < 2) {
      showToast.error('Ingresá el nombre del cliente');
      return;
    }
    const emailLike = contact.includes('@');
    setSaving(true);
    try {
      await reservationsAdmin.createReservation({
        sessionId: session.id,
        quantity: qty,
        customerName: name.trim(),
        customerEmail: emailLike ? contact.trim() : undefined,
        customerPhone: emailLike ? undefined : contact.trim() || undefined,
        paymentMethod: method,
      });
      showToast.success('Reserva creada');
      setName('');
      setContact('');
      setQty(1);
      await load();
      onChanged();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
      <div className='flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white'>
        <div className='flex items-center justify-between border-b border-[#e6dbcd] px-6 py-4'>
          <div>
            <p className='font-mono text-[11px] tracking-wider text-[#9d684e]'>
              ANOTADOS
            </p>
            <h2 className='font-playfair text-xl text-[#3d3338]'>
              {session
                ? `${session.experienceName} · ${fmtDateTime(session.startAt)}`
                : 'Turno'}
            </h2>
          </div>
          <button type='button' onClick={onClose}>
            <X className='h-5 w-5 text-[#7a6e6f]' />
          </button>
        </div>

        <div className='grid flex-1 gap-5 overflow-y-auto p-6 md:grid-cols-[1fr_300px]'>
          {/* Lista de anotados */}
          <div className='overflow-hidden rounded-lg border border-[#e6dbcd]'>
            <div className='grid grid-cols-[auto_1fr_auto_auto] gap-2 bg-[#fbf5ef] px-4 py-2.5 font-mono text-[11px] tracking-wider text-[#7a6e6f]'>
              <span>CÓDIGO</span>
              <span>CLIENTE</span>
              <span>PERS.</span>
              <span>ESTADO</span>
            </div>
            {loading ? (
              <div className='p-4 text-sm text-[#7a6e6f]'>Cargando…</div>
            ) : reservations.length === 0 ? (
              <div className='p-4 text-sm text-[#7a6e6f]'>Sin anotados aún.</div>
            ) : (
              reservations.map((r) => (
                <div
                  key={r._id}
                  className='grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 border-t border-[#e6dbcd] px-4 py-3'
                >
                  <span className='font-mono text-sm font-semibold text-[#9d684e]'>
                    {prettyCode(r.code)}
                  </span>
                  <div>
                    <p className='text-sm font-medium text-[#3d3338]'>
                      {r.customerName}
                    </p>
                    <p className='text-xs text-[#7a6e6f]'>
                      {r.customerEmail ?? r.customerPhone ?? '—'}
                    </p>
                  </div>
                  <span className='text-sm text-[#3d3338]'>{r.quantity}</span>
                  <span className='text-xs text-[#7a6e6f]'>
                    {RESERVATION_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Alta de reserva */}
          <div className='flex flex-col gap-3 rounded-lg border border-[#e6dbcd] p-4'>
            <div className='flex items-center gap-2'>
              <UserPlus className='h-4 w-4 text-[#9d684e]' />
              <h3 className='font-playfair text-lg text-[#3d3338]'>
                Agregar reserva
              </h3>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Nombre y apellido'
              className={inputCls}
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder='Teléfono o email'
              className={inputCls}
            />
            <div className='flex items-center gap-3'>
              <div className='flex items-center overflow-hidden rounded-lg border border-[#e6dbcd]'>
                <button
                  type='button'
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className='flex h-10 w-10 items-center justify-center text-[#3d3338]'
                >
                  <Minus className='h-4 w-4' />
                </button>
                <span className='w-10 text-center font-playfair text-lg text-[#3d3338]'>
                  {qty}
                </span>
                <button
                  type='button'
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  className='flex h-10 w-10 items-center justify-center bg-[#9d684e] text-white'
                >
                  <Plus className='h-4 w-4' />
                </button>
              </div>
              <span className='text-xs text-[#7a6e6f]'>
                {session ? `${session.seatsAvailable} disp.` : ''}
              </span>
            </div>
            <div className='grid grid-cols-3 gap-2'>
              {METHODS.map((m) => {
                const on = m.key === method;
                return (
                  <button
                    key={m.key}
                    type='button'
                    onClick={() => setMethod(m.key)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                      on
                        ? 'border-[#9d684e] bg-[#9d684e] text-white'
                        : 'border-[#e6dbcd] bg-[#fbf5ef] text-[#3d3338]'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div className='flex items-center justify-between border-t border-[#e6dbcd] pt-3'>
              <span className='text-sm text-[#7a6e6f]'>
                {isCourtesy ? 'Sin cargo' : 'Total a cobrar'}
              </span>
              <span className='font-playfair text-xl font-semibold text-[#9d684e]'>
                {fmtPrice(total)}
              </span>
            </div>
            {!isCourtesy && (
              <p className='text-[11px] text-[#7a6e6f]'>
                Impacta caja (requiere caja abierta).
              </p>
            )}
            <button
              type='button'
              onClick={create}
              disabled={saving}
              className='rounded-lg bg-[#cc844a] px-4 py-3 font-mono text-xs tracking-wider text-[#3d3338] disabled:opacity-60'
            >
              {saving ? 'CREANDO…' : 'CONFIRMAR RESERVA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] px-3 py-2.5 text-sm text-[#3d3338] outline-none focus:border-[#9d684e]';
