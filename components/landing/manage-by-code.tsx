'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import {
  reservationsPublic,
  type ReservationView,
} from '@/services/reservations.public.service';
import { StatusText } from '@/components/landing/primitives';

function fmtDate(iso: string) {
  const tz = 'America/Argentina/Buenos_Aires';
  const date = new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: tz,
  });
  const time = new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });
  return `${date} · ${time}`;
}

export function ManageByCode() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<ReservationView | null>(null);

  async function search() {
    const c = code.trim().replace('-', '');
    if (c.length < 6) {
      setError('El código tiene 6 caracteres (ej. MIS482).');
      return;
    }
    setLoading(true);
    setError(null);
    setReservation(null);
    try {
      setReservation(await reservationsPublic.getByCode(c));
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
    <div className='grid items-center gap-12 lg:grid-cols-2'>
      <div className='flex flex-col gap-4'>
        <h2 className='font-playfair text-4xl font-medium leading-tight tracking-tight text-arena lg:text-[42px]'>
          ¿Ya reservaste? Modificá o cancelá al toque
        </h2>
        <p className='max-w-md text-base leading-relaxed text-arena/80'>
          Ingresá el código de 6 caracteres (3 letras + 3 números) que te enviamos
          al confirmar. Sin cuentas ni contraseñas.
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
            className='w-full border border-arena/30 bg-arena/10 px-4 py-[14px] font-mono tracking-[0.2em] text-arena outline-none placeholder:text-arena/40 focus:border-arena/60'
          />
          <button
            type='button'
            onClick={search}
            disabled={loading}
            className='press flex items-center gap-2 bg-arena px-6 py-[14px] font-mono text-xs uppercase tracking-[0.14em] text-terracota disabled:opacity-60'
          >
            <Search className='h-4 w-4' />
            Buscar
          </button>
        </div>

        {error && <p className='text-sm font-medium text-rosa-claro'>{error}</p>}

        {reservation && (
          <div className='bg-arena/10 p-5 text-arena'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <p className='font-mono text-xs tracking-[0.2em] text-arena/60'>
                  {reservation.code}
                </p>
                <p className='mt-1 font-playfair text-xl font-medium'>
                  {reservation.experienceName}
                </p>
                <p className='text-sm text-arena/70'>
                  {fmtDate(reservation.startAt)} · {reservation.quantity}{' '}
                  {reservation.quantity > 1 ? 'personas' : 'persona'}
                </p>
              </div>
              <StatusText status={reservation.status} className='shrink-0 text-arena/80' />
            </div>
            {canCancel && (
              <button
                type='button'
                onClick={cancel}
                disabled={loading}
                className='press mt-4 border border-arena/30 px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-arena hover:bg-arena/10 disabled:opacity-60'
              >
                Cancelar reserva
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
