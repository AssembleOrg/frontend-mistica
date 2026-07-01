'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Calendar, Minus, Plus, ShieldCheck } from 'lucide-react';
import {
  newIdempotencyKey,
  reservationsPublic,
  type PublicExperience,
  type PublicSession,
} from '@/services/reservations.public.service';
import { SectionLabel } from '@/components/landing/primitives';

function fmtPrice(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  const tz = 'America/Argentina/Buenos_Aires';
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: tz,
  });
  const time = d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });
  return `${date} · ${time}`;
}

const TZ = 'America/Argentina/Buenos_Aires';

// Encabezado de día para agrupar turnos, ej. "VIE 04·07".
function fmtDayHeader(iso: string) {
  const d = new Date(iso);
  const wd = d.toLocaleDateString('es-AR', { weekday: 'short', timeZone: TZ });
  const dm = d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: TZ,
  });
  return `${wd.replace('.', '')} ${dm.replace('/', '·')}`.toUpperCase();
}

// Clave de día (YYYY-MM-DD en TZ AR) para agrupar.
function dayKey(iso: string) {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ,
  });
}

// ── Validación de "Tus datos" (estándar; email/tel opcionales) ──────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Deja solo dígitos y un '+' inicial opcional.
function normalizePhone(raw: string) {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  return plus + trimmed.replace(/[^\d]/g, '');
}

function validateName(v: string) {
  return v.trim().length > 2 ? null : 'Ingresá tu nombre.';
}
function validateEmail(v: string) {
  if (!v.trim()) return null; // opcional
  return EMAIL_RE.test(v.trim()) ? null : 'Email inválido.';
}
function validatePhone(v: string) {
  if (!v.trim()) return null; // opcional
  const digits = normalizePhone(v).replace('+', '');
  return digits.length >= 8 ? null : 'Teléfono inválido.';
}

// Opción seleccionable (experiencia). Sin "pill": borde fino + press.
const option = (on: boolean) =>
  `press border px-4 py-3 text-left text-sm transition ${
    on
      ? 'border-terracota bg-terracota text-arena'
      : 'border-linea bg-arena text-ciruela-oscuro hover:border-terracota/50'
  }`;

function StepLabel({ n, children }: { n: string; children: string }) {
  return (
    <div className='flex items-baseline gap-3'>
      <span className='font-mono text-xs tabular-nums text-terracota'>{n}</span>
      <SectionLabel>{children}</SectionLabel>
    </div>
  );
}

export function ReservationForm({
  experiences,
  sessions,
  lockedExperienceId,
}: {
  experiences: PublicExperience[];
  sessions: PublicSession[];
  /** Si viene, la experiencia queda fija (flujo desde el índice/sheet). */
  lockedExperienceId?: string;
}) {
  const [expId, setExpId] = useState(
    lockedExperienceId ?? experiences[0]?._id ?? '',
  );
  const [sessionId, setSessionId] = useState('');
  const [qty, setQty] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idemKey] = useState(() => newIdempotencyKey());
  // Marca qué campos ya fueron tocados para no mostrar error antes de tiempo.
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });

  const sessionsForExp = useMemo(
    () =>
      sessions
        .filter((s) => s.experienceId === expId && s.seatsAvailable > 0)
        .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)),
    [sessions, expId],
  );

  // Turnos agrupados por día (para la grilla): [{ key, header, slots }].
  const sessionsByDay = useMemo(() => {
    const groups = new Map<string, PublicSession[]>();
    for (const s of sessionsForExp) {
      const k = dayKey(s.startAt);
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(s);
    }
    return [...groups.entries()].map(([key, slots]) => ({
      key,
      header: fmtDayHeader(slots[0].startAt),
      slots,
    }));
  }, [sessionsForExp]);

  // Reset del turno al cambiar de experiencia — pero NO en el mount inicial
  // (si no, el flujo del sheet limpia la selección recién hecha).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
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
  const locked = !!lockedExperienceId;

  // Errores de formato de "Tus datos".
  const nameError = validateName(name);
  const emailError = validateEmail(email);
  const phoneError = validatePhone(phone);
  const dataValid = !nameError && !emailError && !phoneError;
  const canSubmit = !!selected && qty >= 1 && dataValid && !submitting;

  async function submit() {
    if (!selected) {
      setError('Elegí un turno disponible.');
      return;
    }
    if (!dataValid) {
      setTouched({ name: true, email: true, phone: true });
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const normalizedPhone = normalizePhone(phone);
      const hold = await reservationsPublic.createHold({
        sessionId: selected.id,
        quantity: qty,
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
        customerPhone: normalizedPhone || undefined,
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
      <div className='border border-linea bg-arena p-8 text-center text-piedra'>
        Por ahora no hay experiencias disponibles. Volvé pronto.
      </div>
    );
  }

  return (
    <div
      className={
        locked
          ? 'grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-10'
          : 'grid gap-10 lg:grid-cols-[1fr_400px]'
      }
    >
      {/* Formulario */}
      <div className='flex flex-col gap-8'>
        {/* Experiencia (oculta cuando viene bloqueada desde el índice) */}
        {!locked && (
          <div className='flex flex-col gap-3.5'>
            <StepLabel n='01'>Elegí la experiencia</StepLabel>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
              {experiences.map((e) => (
                <button
                  key={e._id}
                  type='button'
                  onClick={() => setExpId(e._id)}
                  className={option(e._id === expId)}
                >
                  {e.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fecha y horario */}
        <div className='flex flex-col gap-3.5'>
          <StepLabel n={locked ? '01' : '02'}>Fecha y horario</StepLabel>
          {sessionsForExp.length === 0 ? (
            <p className='flex items-center gap-2 border border-linea bg-arena px-4 py-3.5 text-sm text-piedra'>
              <Calendar className='h-[18px] w-[18px] text-terracota' />
              No hay turnos disponibles para esta experiencia.
            </p>
          ) : (
            <div className='sheet-scroll flex max-h-[340px] flex-col gap-5 overflow-y-auto lg:max-h-[420px]'>
              {sessionsByDay.map((day) => (
                <div key={day.key} className='flex flex-col gap-2.5'>
                  <span className='font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ciruela-oscuro'>
                    {day.header}
                  </span>
                  <div className='flex flex-wrap gap-2'>
                    {day.slots.map((s) => {
                      const on = s.id === sessionId;
                      const low = s.seatsAvailable <= 3;
                      return (
                        <button
                          key={s.id}
                          type='button'
                          onClick={() => {
                            setSessionId(s.id);
                            setQty(1);
                          }}
                          className={`press flex w-28 flex-col items-center gap-1 border py-2.5 transition ${
                            on
                              ? 'border-terracota bg-terracota text-arena'
                              : 'border-linea bg-arena text-ciruela-oscuro hover:border-terracota/50'
                          }`}
                        >
                          <span className='font-playfair text-lg font-medium leading-none'>
                            {fmtTime(s.startAt)}
                          </span>
                          <span
                            className={`text-[11px] ${
                              on
                                ? 'text-arena/70'
                                : low
                                  ? 'font-medium text-terracota'
                                  : 'text-piedra'
                            }`}
                          >
                            {s.seatsAvailable} cup.
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Personas */}
        <div className='flex flex-col gap-3.5'>
          <StepLabel n={locked ? '02' : '03'}>Cantidad de personas</StepLabel>
          <div className='flex items-center gap-[18px]'>
            <div className='flex items-center border border-linea bg-arena'>
              <button
                type='button'
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className='press flex h-[52px] w-[52px] items-center justify-center text-ciruela-oscuro disabled:opacity-30'
              >
                <Minus className='h-[18px] w-[18px]' />
              </button>
              <span className='flex h-[52px] w-16 items-center justify-center font-playfair text-[22px] font-medium text-ciruela-oscuro'>
                {qty}
              </span>
              <button
                type='button'
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={!selected || qty >= maxQty}
                className='press flex h-[52px] w-[52px] items-center justify-center bg-terracota text-arena disabled:opacity-40'
              >
                <Plus className='h-[18px] w-[18px]' />
              </button>
            </div>
            <span className='text-sm text-piedra'>
              {selected ? `Hasta ${maxQty} por este turno` : 'Elegí un turno primero'}
            </span>
          </div>
        </div>

        {/* Datos */}
        <div className='flex flex-col gap-3.5'>
          <StepLabel n={locked ? '03' : '04'}>Tus datos</StepLabel>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='flex flex-col gap-1'>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                placeholder='Nombre y apellido'
                className={inputCls(touched.name && !!nameError)}
              />
              {touched.name && nameError && <FieldError>{nameError}</FieldError>}
            </div>
            <div className='flex flex-col gap-1'>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                placeholder='Teléfono / WhatsApp'
                inputMode='tel'
                className={inputCls(touched.phone && !!phoneError)}
              />
              {touched.phone && phoneError && <FieldError>{phoneError}</FieldError>}
            </div>
          </div>
          <div className='flex flex-col gap-1'>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder='Email'
              inputMode='email'
              className={inputCls(touched.email && !!emailError)}
            />
            {touched.email && emailError && <FieldError>{emailError}</FieldError>}
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className='h-fit border border-linea bg-arena-2 lg:sticky lg:top-4 lg:self-start'>
        <div className='bg-verde-profundo px-6 py-5'>
          <SectionLabel tone='arena'>Tu reserva</SectionLabel>
          <p className='mt-1.5 font-playfair text-[26px] font-medium text-arena'>
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
                i < 2 ? 'border-b border-linea' : ''
              }`}
            >
              <span className='text-sm text-piedra'>{k}</span>
              <span className='text-[15px] font-medium text-ciruela-oscuro'>
                {v}
              </span>
            </div>
          ))}
        </div>
        <div className='flex items-center justify-between border-b border-linea px-6 py-3.5'>
          <span className='text-sm text-piedra'>Total experiencia</span>
          <span className='text-[15px] font-medium text-ciruela-oscuro'>
            {fmtPrice(total)}
          </span>
        </div>
        <div className='flex items-center justify-between bg-arena px-6 py-5'>
          <span className='font-mono text-[11px] uppercase tracking-[0.14em] text-ciruela-oscuro'>
            Seña ({depositPct}%) · pagás ahora
          </span>
          <span className='font-playfair text-[28px] font-semibold text-terracota'>
            {fmtPrice(senia)}
          </span>
        </div>
        <div className='flex items-center justify-between px-6 py-3'>
          <span className='text-[13px] text-piedra'>Saldo (en el local)</span>
          <span className='text-sm font-medium text-ciruela-oscuro'>
            {fmtPrice(saldo)}
          </span>
        </div>
        {error && (
          <p className='px-6 pt-4 text-sm font-medium text-red-600'>{error}</p>
        )}
        <div className='flex items-start gap-2.5 px-6 pb-2 pt-4'>
          <ShieldCheck className='mt-0.5 h-[18px] w-[18px] shrink-0 text-terracota' />
          <p className='text-[13px] leading-[1.5] text-piedra'>
            Reservás abonando la seña con MercadoPago. El saldo lo completás en el
            local. Recibís un código de 6 caracteres para gestionar tu reserva.
          </p>
        </div>
        <div className='p-4'>
          <button
            type='button'
            onClick={submit}
            disabled={!canSubmit}
            className='press flex w-full items-center justify-center gap-2.5 bg-naranja-medio px-6 py-[19px] font-mono text-sm uppercase tracking-[0.14em] text-ciruela-oscuro transition hover:brightness-95 disabled:opacity-50'
          >
            {submitting ? 'Iniciando pago…' : 'Confirmar reserva'}
            {!submitting && <ArrowRight className='h-[18px] w-[18px]' />}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls = (hasError = false) =>
  `border bg-arena px-[18px] py-[15px] text-[15px] text-ciruela-oscuro outline-none transition placeholder:text-piedra ${
    hasError
      ? 'border-red-500 focus:border-red-500'
      : 'border-linea focus:border-terracota'
  }`;

function FieldError({ children }: { children: string }) {
  return <span className='text-xs font-medium text-red-600'>{children}</span>;
}
