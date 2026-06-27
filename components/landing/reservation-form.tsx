'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calendar, Minus, Plus, ShieldCheck } from 'lucide-react';
import {
  newIdempotencyKey,
  reservationsPublic,
  type PublicExperience,
  type PublicSession,
} from '@/services/reservations.public.service';

function fmtPrice(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${date} · ${time}`;
}

export function ReservationForm({
  experiences,
  sessions,
}: {
  experiences: PublicExperience[];
  sessions: PublicSession[];
}) {
  const [expId, setExpId] = useState(experiences[0]?._id ?? '');
  const [sessionId, setSessionId] = useState('');
  const [qty, setQty] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idemKey] = useState(() => newIdempotencyKey());

  const sessionsForExp = useMemo(
    () =>
      sessions
        .filter((s) => s.experienceId === expId && s.seatsAvailable > 0)
        .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)),
    [sessions, expId],
  );

  // Al cambiar de experiencia, reseteamos el turno elegido.
  useEffect(() => {
    setSessionId('');
    setQty(1);
  }, [expId]);

  const selected = sessions.find((s) => s.id === sessionId);
  const maxQty = selected ? Math.min(selected.seatsAvailable, 12) : 12;
  const total = selected ? selected.price * qty : 0;

  const canSubmit = !!selected && qty >= 1 && name.trim().length > 1 && !submitting;

  async function submit() {
    if (!selected) {
      setError('Elegí un turno disponible.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const hold = await reservationsPublic.createHold({
        sessionId: selected.id,
        quantity: qty,
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        idempotencyKey: idemKey,
      });
      if (hold.initPoint) {
        window.location.href = hold.initPoint;
        return;
      }
      window.location.href = `/reservas/estado?ref=${hold.reservationId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar la reserva.');
      setSubmitting(false);
    }
  }

  if (experiences.length === 0) {
    return (
      <div className='rounded-xl border border-[#e6dbcd] bg-white p-8 text-center text-ciruela-oscuro/70'>
        Por ahora no hay experiencias disponibles. Volvé pronto.
      </div>
    );
  }

  const labelCls =
    'font-mono text-[11px] tracking-wider text-ciruela-oscuro/60 uppercase';

  return (
    <div className='grid gap-6 lg:grid-cols-[1fr_360px]'>
      {/* Formulario */}
      <div className='flex flex-col gap-8'>
        {/* 1. Experiencia */}
        <div className='flex flex-col gap-3'>
          <span className={labelCls}>01 · Elegí la experiencia</span>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {experiences.map((e) => {
              const on = e._id === expId;
              return (
                <button
                  key={e._id}
                  type='button'
                  onClick={() => setExpId(e._id)}
                  className={`rounded-lg border px-3 py-3 text-center text-sm font-medium transition ${
                    on
                      ? 'border-terracota bg-terracota text-white'
                      : 'border-[#e6dbcd] bg-white text-ciruela-oscuro hover:border-terracota/50'
                  }`}
                >
                  {e.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Fecha y horario */}
        <div className='flex flex-col gap-3'>
          <span className={labelCls}>02 · Fecha y horario</span>
          {sessionsForExp.length === 0 ? (
            <p className='rounded-lg border border-[#e6dbcd] bg-white px-4 py-3 text-sm text-ciruela-oscuro/60'>
              <Calendar className='mr-2 inline h-4 w-4 text-terracota' />
              No hay turnos disponibles para esta experiencia.
            </p>
          ) : (
            <div className='flex flex-wrap gap-2.5'>
              {sessionsForExp.map((s) => {
                const on = s.id === sessionId;
                return (
                  <button
                    key={s.id}
                    type='button'
                    onClick={() => {
                      setSessionId(s.id);
                      setQty(1);
                    }}
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                      on
                        ? 'border-terracota bg-terracota text-white'
                        : 'border-[#e6dbcd] bg-white text-ciruela-oscuro hover:border-terracota/50'
                    }`}
                  >
                    {fmtDate(s.startAt)}
                    <span
                      className={`ml-2 text-xs ${on ? 'text-white/70' : 'text-ciruela-oscuro/50'}`}
                    >
                      {s.seatsAvailable} lug.
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Personas */}
        <div className='flex flex-col gap-3'>
          <span className={labelCls}>03 · Cantidad de personas</span>
          <div className='flex items-center gap-4'>
            <div className='flex items-center overflow-hidden rounded-lg border border-[#e6dbcd] bg-white'>
              <button
                type='button'
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className='flex h-12 w-12 items-center justify-center text-ciruela-oscuro disabled:opacity-30'
              >
                <Minus className='h-4 w-4' />
              </button>
              <span className='w-14 text-center font-tan-nimbus text-xl text-ciruela-oscuro'>
                {qty}
              </span>
              <button
                type='button'
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={!selected || qty >= maxQty}
                className='flex h-12 w-12 items-center justify-center bg-terracota text-white disabled:opacity-40'
              >
                <Plus className='h-4 w-4' />
              </button>
            </div>
            <span className='text-sm text-ciruela-oscuro/60'>
              {selected
                ? `Hasta ${maxQty} por este turno`
                : 'Elegí un turno primero'}
            </span>
          </div>
        </div>

        {/* 4. Datos */}
        <div className='flex flex-col gap-3'>
          <span className={labelCls}>04 · Tus datos</span>
          <div className='grid gap-3 sm:grid-cols-2'>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Nombre y apellido'
              className='rounded-lg border border-[#e6dbcd] bg-white px-4 py-3 text-sm text-ciruela-oscuro outline-none focus:border-terracota'
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder='Teléfono / WhatsApp'
              className='rounded-lg border border-[#e6dbcd] bg-white px-4 py-3 text-sm text-ciruela-oscuro outline-none focus:border-terracota'
            />
          </div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='Email'
            className='rounded-lg border border-[#e6dbcd] bg-white px-4 py-3 text-sm text-ciruela-oscuro outline-none focus:border-terracota'
          />
        </div>
      </div>

      {/* Resumen */}
      <div className='h-fit overflow-hidden rounded-xl border border-[#e6dbcd] bg-white'>
        <div className='bg-verde-profundo px-6 py-5'>
          <p className='font-mono text-[11px] tracking-widest text-white/60'>
            TU RESERVA
          </p>
          <p className='mt-1 font-tan-nimbus text-2xl text-white'>
            {experiences.find((e) => e._id === expId)?.name ?? 'Experiencia'}
          </p>
        </div>
        <div className='flex flex-col px-6 py-2'>
          {[
            ['Fecha', selected ? fmtDate(selected.startAt) : '—'],
            ['Personas', String(qty)],
            ['Precio p/persona', selected ? fmtPrice(selected.price) : '—'],
          ].map(([k, v], i) => (
            <div
              key={k}
              className={`flex items-center justify-between py-3.5 ${
                i < 2 ? 'border-b border-[#e6dbcd]' : ''
              }`}
            >
              <span className='text-sm text-ciruela-oscuro/60'>{k}</span>
              <span className='text-sm font-medium text-ciruela-oscuro'>{v}</span>
            </div>
          ))}
        </div>
        <div className='flex items-center justify-between bg-[#fbf5ef] px-6 py-4'>
          <span className='font-mono text-xs tracking-wider text-ciruela-oscuro'>
            TOTAL
          </span>
          <span className='font-tan-nimbus text-2xl font-semibold text-terracota'>
            {fmtPrice(total)}
          </span>
        </div>
        {error && (
          <p className='px-6 pt-4 text-sm font-medium text-red-600'>{error}</p>
        )}
        <div className='p-4'>
          <button
            type='button'
            onClick={submit}
            disabled={!canSubmit}
            className='flex w-full items-center justify-center gap-2 rounded-lg bg-naranja-medio px-6 py-4 font-mono text-sm tracking-wider text-ciruela-oscuro transition hover:bg-naranja-medio-hover disabled:opacity-50'
          >
            {submitting ? 'INICIANDO PAGO…' : 'RESERVAR Y PAGAR'}
            {!submitting && <ArrowRight className='h-4 w-4' />}
          </button>
          <p className='mt-3 flex items-start gap-2 px-1 text-xs text-ciruela-oscuro/55'>
            <ShieldCheck className='mt-0.5 h-4 w-4 shrink-0 text-terracota' />
            Pagás con MercadoPago. Al confirmar recibís un código de 6 caracteres
            para gestionar tu reserva.
          </p>
        </div>
      </div>
    </div>
  );
}
