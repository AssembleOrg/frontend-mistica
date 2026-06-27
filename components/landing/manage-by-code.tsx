'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import {
  reservationsPublic,
  type ReservationView,
} from '@/services/reservations.public.service';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente de pago',
  CONFIRMED: 'Confirmada',
  EXPIRED: 'Vencida',
  CANCELLED: 'Cancelada',
  NEEDS_REVIEW: 'En revisión',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ManageByCode() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ReservationView | null>(null);

  async function search() {
    const c = code.trim();
    if (c.length < 6) {
      setError('El código tiene 6 caracteres (ej. MIS482).');
      return;
    }
    setLoading(true);
    setError(null);
    setReservation(null);
    try {
      setReservation(await reservationsPublic.getByCode(c.replace('-', '')));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No encontramos esa reserva.');
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!reservation) return;
    if (!confirm('¿Seguro que querés cancelar esta reserva?')) return;
    setLoading(true);
    try {
      setReservation(await reservationsPublic.cancelByCode(reservation.code));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cancelar.');
    } finally {
      setLoading(false);
    }
  }

  const canCancel =
    reservation &&
    (reservation.status === 'PENDING' || reservation.status === 'CONFIRMED');

  return (
    <div className='grid items-center gap-10 lg:grid-cols-2'>
      <div className='flex flex-col gap-4'>
        <div className='flex items-center gap-3'>
          <span className='h-px w-8 bg-rosa-claro' />
          <span className='font-mono text-xs tracking-[3px] text-rosa-claro'>
            GESTIONÁ TU RESERVA
          </span>
        </div>
        <h2 className='font-tan-nimbus text-3xl leading-tight text-white sm:text-4xl'>
          ¿Ya reservaste? Modificá o cancelá al toque
        </h2>
        <p className='max-w-md text-white/80'>
          Ingresá el código de 6 caracteres (3 letras + 3 números) que te
          enviamos al confirmar. Sin cuentas ni contraseñas.
        </p>
      </div>

      <div className='flex flex-col gap-4'>
        <div className='flex gap-3'>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder='MIS-482'
            maxLength={7}
            className='w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3.5 font-mono tracking-widest text-white placeholder:text-white/40 outline-none focus:border-white/60'
          />
          <button
            type='button'
            onClick={search}
            disabled={loading}
            className='flex items-center gap-2 rounded-lg bg-white px-6 py-3.5 font-mono text-sm tracking-wider text-terracota disabled:opacity-60'
          >
            <Search className='h-4 w-4' />
            BUSCAR
          </button>
        </div>

        {error && <p className='text-sm font-medium text-rosa-claro'>{error}</p>}

        {reservation && (
          <div className='rounded-xl bg-white/10 p-5 text-white'>
            <div className='flex items-start justify-between'>
              <div>
                <p className='font-mono text-xs tracking-widest text-white/60'>
                  {reservation.code}
                </p>
                <p className='mt-1 font-tan-nimbus text-xl'>
                  {reservation.experienceName}
                </p>
                <p className='text-sm text-white/70'>
                  {fmtDate(reservation.startAt)} · {reservation.quantity}{' '}
                  {reservation.quantity > 1 ? 'personas' : 'persona'}
                </p>
              </div>
              <span className='rounded-full bg-white/15 px-3 py-1 font-mono text-[11px]'>
                {STATUS_LABEL[reservation.status] ?? reservation.status}
              </span>
            </div>
            {canCancel && (
              <button
                type='button'
                onClick={cancel}
                disabled={loading}
                className='mt-4 rounded-lg border border-white/30 px-4 py-2 font-mono text-xs tracking-wider text-white hover:bg-white/10 disabled:opacity-60'
              >
                CANCELAR RESERVA
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
