'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock4,
  Loader2,
  XCircle,
} from 'lucide-react';
import {
  reservationsPublic,
  type ReservationView,
} from '@/services/reservations.public.service';
import { ReservationCode, StatusText } from '@/components/landing/primitives';

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

function prettyCode(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

function EstadoInner() {
  const params = useSearchParams();
  const ref = params.get('ref');
  const [reservation, setReservation] = useState<ReservationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(!!ref);
  const attempts = useRef(0);

  useEffect(() => {
    if (!ref) {
      setPolling(false);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;

    const tick = async () => {
      try {
        const r = await reservationsPublic.getStatus(ref);
        if (!alive) return;
        setReservation(r);
        const terminal = r.status !== 'PENDING';
        attempts.current += 1;
        if (terminal || attempts.current >= 40) {
          setPolling(false);
          return;
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'No pudimos leer tu reserva.');
        setPolling(false);
        return;
      }
      timer = setTimeout(tick, 3000);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [ref]);

  const status = reservation?.status;
  const confirmed = status === 'CONFIRMED';
  const failed = status === 'EXPIRED' || status === 'CANCELLED';
  const review = status === 'NEEDS_REVIEW';
  const waiting = polling || status === 'PENDING';

  return (
    <main className='flex min-h-[100dvh] items-center justify-center bg-arena px-6 py-16 font-inter'>
      <div className='w-full max-w-lg border border-linea bg-white p-8 text-center sm:p-12'>
        {/* Icono de estado */}
        <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-verde-profundo'>
          {confirmed ? (
            <CheckCircle2 className='h-8 w-8 text-white' />
          ) : failed ? (
            <XCircle className='h-8 w-8 text-white' />
          ) : review ? (
            <Clock4 className='h-8 w-8 text-white' />
          ) : (
            <Loader2 className='h-8 w-8 animate-spin text-white' />
          )}
        </div>

        {!ref && <CodeLookup onFound={setReservation} found={reservation} />}

        {ref && (
          <>
            {status && (
              <div className='mb-4 flex justify-center'>
                <StatusText status={status} className='text-piedra' />
              </div>
            )}

            <h1 className='font-playfair text-3xl font-medium leading-tight text-ciruela-oscuro'>
              {confirmed
                ? '¡Tu lugar está reservado!'
                : failed
                  ? 'La reserva no se completó'
                  : review
                    ? 'Estamos revisando tu pago'
                    : 'Confirmando tu pago…'}
            </h1>

            <p className='mt-3 text-piedra'>
              {confirmed && reservation
                ? `${reservation.experienceName} · ${fmtDate(reservation.startAt)} · ${reservation.quantity} ${reservation.quantity > 1 ? 'personas' : 'persona'}.`
                : failed
                  ? 'El pago no se aprobó o el tiempo de reserva venció. Podés intentar de nuevo.'
                  : review
                    ? 'Tu pago llegó pero necesitamos revisarlo. Te contactamos a la brevedad.'
                    : 'No cierres esta página. Apenas MercadoPago confirme, vas a ver tu código acá.'}
            </p>

            {error && (
              <p className='mt-4 text-sm font-medium text-red-600'>{error}</p>
            )}

            {confirmed && reservation && (
              <div className='mt-7'>
                <ReservationCode code={reservation.code} />
                <p className='mt-3 text-xs text-piedra/70'>
                  Guardalo para modificar o cancelar tu reserva.
                </p>
              </div>
            )}

            {waiting && (
              <p className='mt-6 text-sm text-piedra/60'>
                Esto puede tardar unos segundos…
              </p>
            )}

            <div className='mt-8 flex justify-center'>
              <Link
                href='/'
                className='press flex items-center gap-2 border border-linea px-6 py-3 font-mono text-xs uppercase tracking-[0.12em] text-ciruela-oscuro hover:bg-arena-2'
              >
                <ArrowLeft className='h-4 w-4' /> Volver al inicio
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function CodeLookup({
  onFound,
  found,
}: {
  onFound: (r: ReservationView) => void;
  found: ReservationView | null;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    const c = code.trim().replace('-', '');
    if (c.length < 6) {
      setError('El código tiene 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      onFound(await reservationsPublic.getByCode(c));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No encontramos esa reserva.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className='font-playfair text-3xl font-medium text-ciruela-oscuro'>
        Buscá tu reserva
      </h1>
      <p className='mt-2 text-piedra'>
        Ingresá el código de 6 caracteres que te enviamos.
      </p>
      <div className='mt-6 flex gap-3'>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder='MIS-482'
          maxLength={7}
          className='w-full border border-linea bg-arena-2 px-4 py-3 text-center font-mono tracking-[0.2em] text-ciruela-oscuro outline-none focus:border-terracota'
        />
        <button
          type='button'
          onClick={search}
          disabled={loading}
          className='press bg-terracota px-6 font-mono text-xs uppercase tracking-[0.14em] text-white disabled:opacity-60'
        >
          Buscar
        </button>
      </div>
      {error && <p className='mt-3 text-sm font-medium text-red-600'>{error}</p>}
      {found && (
        <div className='mt-6 border border-linea bg-arena-2 p-5 text-left'>
          <div className='flex items-start justify-between gap-3'>
            <p className='font-mono text-xs tracking-[0.2em] text-terracota'>
              {prettyCode(found.code)}
            </p>
            <StatusText status={found.status} className='text-piedra' />
          </div>
          <p className='mt-1 font-playfair text-xl text-ciruela-oscuro'>
            {found.experienceName}
          </p>
          <p className='text-sm text-piedra'>
            {fmtDate(found.startAt)} · {found.quantity}{' '}
            {found.quantity > 1 ? 'personas' : 'persona'}
          </p>
        </div>
      )}
    </div>
  );
}

export default function EstadoPage() {
  return (
    <Suspense
      fallback={
        <main className='flex min-h-[100dvh] items-center justify-center bg-arena'>
          <Loader2 className='h-8 w-8 animate-spin text-terracota' />
        </main>
      }
    >
      <EstadoInner />
    </Suspense>
  );
}
