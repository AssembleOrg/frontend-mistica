'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock4,
  Copy,
  Loader2,
  XCircle,
} from 'lucide-react';
import {
  reservationsPublic,
  type ReservationView,
} from '@/services/reservations.public.service';

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
    <main className='flex min-h-svh items-center justify-center bg-[#F6EEE6] px-6 py-16'>
      <div className='w-full max-w-lg rounded-2xl border border-[#e6dbcd] bg-white p-8 text-center shadow-sm sm:p-12'>
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

        {!ref && (
          <CodeLookup
            onFound={setReservation}
            found={reservation}
          />
        )}

        {ref && (
          <>
            <h1 className='font-playfair text-3xl leading-tight text-ciruela-oscuro'>
              {confirmed
                ? '¡Tu lugar está reservado!'
                : failed
                  ? 'La reserva no se completó'
                  : review
                    ? 'Estamos revisando tu pago'
                    : 'Confirmando tu pago…'}
            </h1>

            <p className='mt-3 text-ciruela-oscuro/70'>
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
              <CodeBlock code={reservation.code} />
            )}

            {waiting && (
              <p className='mt-6 text-sm text-ciruela-oscuro/50'>
                Esto puede tardar unos segundos…
              </p>
            )}

            <div className='mt-8 flex justify-center'>
              <Link
                href='/'
                className='flex items-center gap-2 rounded-lg border border-[#e6dbcd] px-6 py-3 font-mono text-xs tracking-wider text-ciruela-oscuro hover:bg-[#fbf5ef]'
              >
                <ArrowLeft className='h-4 w-4' /> VOLVER AL INICIO
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className='mt-7 flex flex-col items-center gap-3'>
      <span className='font-mono text-xs tracking-[3px] text-terracota'>
        TU CÓDIGO DE RESERVA
      </span>
      <div className='flex w-full items-center justify-center rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] py-5'>
        <span className='font-mono text-4xl font-semibold tracking-[0.2em] text-ciruela-oscuro'>
          {prettyCode(code)}
        </span>
      </div>
      <button
        type='button'
        onClick={() => {
          navigator.clipboard?.writeText(code);
          setCopied(true);
        }}
        className='flex items-center gap-2 rounded-lg bg-terracota px-5 py-2.5 font-mono text-xs tracking-wider text-white'
      >
        <Copy className='h-4 w-4' /> {copied ? 'COPIADO' : 'COPIAR CÓDIGO'}
      </button>
      <p className='text-xs text-ciruela-oscuro/55'>
        Guardalo para modificar o cancelar tu reserva.
      </p>
    </div>
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
      <h1 className='font-playfair text-3xl text-ciruela-oscuro'>
        Buscá tu reserva
      </h1>
      <p className='mt-2 text-ciruela-oscuro/70'>
        Ingresá el código de 6 caracteres que te enviamos.
      </p>
      <div className='mt-6 flex gap-3'>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder='MIS-482'
          maxLength={7}
          className='w-full rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] px-4 py-3 text-center font-mono tracking-widest text-ciruela-oscuro outline-none focus:border-terracota'
        />
        <button
          type='button'
          onClick={search}
          disabled={loading}
          className='rounded-lg bg-terracota px-6 font-mono text-xs tracking-wider text-white disabled:opacity-60'
        >
          BUSCAR
        </button>
      </div>
      {error && <p className='mt-3 text-sm font-medium text-red-600'>{error}</p>}
      {found && (
        <div className='mt-6 rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] p-5 text-left'>
          <p className='font-mono text-xs tracking-widest text-terracota'>
            {prettyCode(found.code)}
          </p>
          <p className='mt-1 font-playfair text-xl text-ciruela-oscuro'>
            {found.experienceName}
          </p>
          <p className='text-sm text-ciruela-oscuro/65'>
            {fmtDate(found.startAt)} · {found.quantity}{' '}
            {found.quantity > 1 ? 'personas' : 'persona'} · {found.status}
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
        <main className='flex min-h-svh items-center justify-center bg-[#F6EEE6]'>
          <Loader2 className='h-8 w-8 animate-spin text-terracota' />
        </main>
      }
    >
      <EstadoInner />
    </Suspense>
  );
}
