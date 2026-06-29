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
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

const chip = (on: boolean) =>
  `rounded-[4px] border px-4 py-3 text-sm font-medium transition ${
    on
      ? 'border-[#9D684E] bg-[#9D684E] text-[#F6EEE6]'
      : 'border-[#E6DBCD] bg-[#F6EEE6] text-[#3D3338] hover:border-[#9D684E]/50'
  }`;

function GroupLabel({ n, children }: { n: string; children: string }) {
  return (
    <div className='flex items-center gap-2.5'>
      <span className='font-mono text-xs tracking-[1px] text-[#9D684E]'>{n}</span>
      <span className='font-mono text-xs tracking-[1.5px] text-[#3D3338]'>
        {children}
      </span>
    </div>
  );
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

  useEffect(() => {
    setSessionId('');
    setQty(1);
  }, [expId]);

  const selected = sessions.find((s) => s.id === sessionId);
  const maxQty = selected ? Math.min(selected.seatsAvailable, 12) : 12;
  const total = selected ? selected.price * qty : 0;
  const depositPct = selected?.depositPct ?? 50;
  const senia = Math.round((total * depositPct) / 100);
  const saldo = total - senia;
  const expName = experiences.find((e) => e._id === expId)?.name ?? 'Experiencia';
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
      window.location.href = hold.initPoint
        ? hold.initPoint
        : `/reservas/estado?ref=${hold.reservationId}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar la reserva.');
      setSubmitting(false);
    }
  }

  if (experiences.length === 0) {
    return (
      <div className='rounded-[4px] border border-[#E6DBCD] bg-[#F6EEE6] p-8 text-center text-[#7A6E6F]'>
        Por ahora no hay experiencias disponibles. Volvé pronto.
      </div>
    );
  }

  return (
    <div className='grid gap-10 lg:grid-cols-[1fr_400px]'>
      {/* Formulario */}
      <div className='flex flex-col gap-10'>
        {/* 01 Experiencia */}
        <div className='flex flex-col gap-3.5'>
          <GroupLabel n='01'>ELEGÍ LA EXPERIENCIA</GroupLabel>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
            {experiences.map((e) => (
              <button
                key={e._id}
                type='button'
                onClick={() => setExpId(e._id)}
                className={chip(e._id === expId)}
              >
                {e.name}
              </button>
            ))}
          </div>
        </div>

        {/* 02 Fecha y horario */}
        <div className='flex flex-col gap-3.5'>
          <GroupLabel n='02'>FECHA Y HORARIO</GroupLabel>
          {sessionsForExp.length === 0 ? (
            <p className='flex items-center gap-2 rounded-[4px] border border-[#E6DBCD] bg-[#F6EEE6] px-4 py-3.5 text-sm text-[#7A6E6F]'>
              <Calendar className='h-[18px] w-[18px] text-[#9D684E]' />
              No hay turnos disponibles para esta experiencia.
            </p>
          ) : (
            <div className='flex flex-wrap gap-3'>
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
                    className={chip(on)}
                  >
                    {fmtDate(s.startAt)}
                    <span
                      className={`ml-2 text-xs ${on ? 'text-[#F6EEE6]/70' : 'text-[#3D3338]/50'}`}
                    >
                      {s.seatsAvailable} lug.
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 03 Personas */}
        <div className='flex flex-col gap-3.5'>
          <GroupLabel n='03'>CANTIDAD DE PERSONAS</GroupLabel>
          <div className='flex items-center gap-[18px]'>
            <div className='flex items-center overflow-hidden rounded-[4px] border border-[#E6DBCD] bg-[#F6EEE6]'>
              <button
                type='button'
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className='flex h-[52px] w-[52px] items-center justify-center text-[#3D3338] disabled:opacity-30'
              >
                <Minus className='h-[18px] w-[18px]' />
              </button>
              <span className='flex h-[52px] w-16 items-center justify-center font-playfair text-[22px] font-medium text-[#3D3338]'>
                {qty}
              </span>
              <button
                type='button'
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={!selected || qty >= maxQty}
                className='flex h-[52px] w-[52px] items-center justify-center bg-[#9D684E] text-[#F6EEE6] disabled:opacity-40'
              >
                <Plus className='h-[18px] w-[18px]' />
              </button>
            </div>
            <span className='text-sm text-[#7A6E6F]'>
              {selected ? `Hasta ${maxQty} por este turno` : 'Elegí un turno primero'}
            </span>
          </div>
        </div>

        {/* 04 Datos */}
        <div className='flex flex-col gap-3.5'>
          <GroupLabel n='04'>TUS DATOS</GroupLabel>
          <div className='grid gap-3 sm:grid-cols-2'>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Nombre y apellido'
              className={inputCls}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder='Teléfono / WhatsApp'
              className={inputCls}
            />
          </div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='Email'
            className={inputCls}
          />
        </div>
      </div>

      {/* Resumen */}
      <div className='h-fit overflow-hidden rounded-[4px] border border-[#E6DBCD] bg-[#FBF5EF]'>
        <div className='bg-[#455A54] px-6 py-5'>
          <p className='font-mono text-[11px] tracking-[2.5px] text-[#F6EEE6]/60'>
            TU RESERVA
          </p>
          <p className='mt-1.5 font-playfair text-[26px] font-medium text-[#F6EEE6]'>
            {expName}
          </p>
        </div>
        <div className='flex flex-col px-6 py-1.5'>
          {[
            ['Fecha', selected ? fmtDate(selected.startAt) : '—'],
            ['Personas', String(qty)],
            ['Precio p/persona', selected ? fmtPrice(selected.price) : '—'],
          ].map(([k, v], i) => (
            <div
              key={k}
              className={`flex items-center justify-between py-4 ${
                i < 2 ? 'border-b border-[#E6DBCD]' : ''
              }`}
            >
              <span className='font-sans text-sm text-[#7A6E6F]'>{k}</span>
              <span className='font-sans text-[15px] font-medium text-[#3D3338]'>
                {v}
              </span>
            </div>
          ))}
        </div>
        <div className='flex items-center justify-between border-b border-[#E6DBCD] px-6 py-3.5'>
          <span className='font-sans text-sm text-[#7A6E6F]'>Total experiencia</span>
          <span className='font-sans text-[15px] font-medium text-[#3D3338]'>
            {fmtPrice(total)}
          </span>
        </div>
        <div className='flex items-center justify-between bg-[#F6EEE6] px-6 py-5'>
          <span className='font-mono text-xs tracking-[1.5px] text-[#3D3338]'>
            SEÑA ({depositPct}%) · PAGÁS AHORA
          </span>
          <span className='font-playfair text-[28px] font-semibold text-[#9D684E]'>
            {fmtPrice(senia)}
          </span>
        </div>
        <div className='flex items-center justify-between px-6 py-3'>
          <span className='font-sans text-[13px] text-[#7A6E6F]'>
            Saldo (en el local)
          </span>
          <span className='font-sans text-sm font-medium text-[#3D3338]'>
            {fmtPrice(saldo)}
          </span>
        </div>
        {error && (
          <p className='px-6 pt-4 text-sm font-medium text-red-600'>{error}</p>
        )}
        <div className='flex items-start gap-2.5 px-6 pb-2 pt-4'>
          <ShieldCheck className='mt-0.5 h-[18px] w-[18px] shrink-0 text-[#9D684E]' />
          <p className='font-sans text-[13px] leading-[1.5] text-[#7A6E6F]'>
            Reservás abonando la seña con MercadoPago. El saldo lo completás en el
            local. Recibís un código de 6 caracteres para gestionar tu reserva.
          </p>
        </div>
        <div className='p-4'>
          <button
            type='button'
            onClick={submit}
            disabled={!canSubmit}
            className='flex w-full items-center justify-center gap-2.5 rounded-[4px] bg-[#CC844A] px-6 py-[19px] font-mono text-sm tracking-[1.5px] text-[#3D3338] transition hover:brightness-95 disabled:opacity-50'
          >
            {submitting ? 'INICIANDO PAGO…' : 'CONFIRMAR RESERVA'}
            {!submitting && <ArrowRight className='h-[18px] w-[18px]' />}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'rounded-[4px] border border-[#E6DBCD] bg-[#F6EEE6] px-[18px] py-[15px] text-[15px] text-[#3D3338] outline-none transition focus:border-[#9D684E] placeholder:text-[#7A6E6F]';
