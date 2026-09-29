'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Copy,
  Minus,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import {
  newIdempotencyKey,
  reservationsPublic,
  type AvailableShift,
  type HoldResponse,
  type PublicExperience,
} from '@/services/reservations.public.service';
import { SectionLabel } from '@/components/landing/primitives';

// Ventana de reservas del salón (hora local AR). El backend valida con sus
// envs BUSINESS_OPEN/BUSINESS_CLOSE; esto sólo acota el input en el front.
const BUSINESS_OPEN = '15:00';
const BUSINESS_CLOSE = '20:00';

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function fromMin(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
/** ISO con offset fijo de Argentina (sin DST). */
function isoAR(dateKey: string, hhmm: string): string {
  return `${dateKey}T${hhmm}:00-03:00`;
}

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

function StepLabel({ children }: { children: string }) {
  return <SectionLabel>{children}</SectionLabel>;
}

export function ReservationForm({
  experiences,
  lockedExperienceId,
}: {
  experiences: PublicExperience[];
  /** Si viene, la experiencia queda fija (flujo desde el índice/sheet). */
  lockedExperienceId?: string;
}) {
  const [expId, setExpId] = useState(
    lockedExperienceId ?? experiences[0]?._id ?? '',
  );
  // Horario elegido: un sugerido ('2026-08-01|15:00') o 'custom' (hora libre).
  const [slotId, setSlotId] = useState('');
  // Hora libre: día + hora elegidos a mano, validados con el preview.
  const [customDay, setCustomDay] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [customCheck, setCustomCheck] = useState<{
    status: 'idle' | 'checking' | 'ok' | 'no';
    maxPartySize?: number;
    message?: string;
  }>({ status: 'idle' });
  const [slots, setSlots] = useState<AvailableShift[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idemKey] = useState(() => newIdempotencyKey());
  // ¿Es un cumpleaños? El negocio aplica los beneficios del festejo (regalos,
  // lugares bonificados) sobre el precio de la experiencia elegida.
  const [isBday, setIsBday] = useState(false);
  // Montos calculados por el negocio (incluyen promos/beneficios): son los
  // mismos que después se cobran. Si no llegan, se muestra el cálculo local.
  const [srvPricing, setSrvPricing] = useState<{
    unitPrice: number;
    totalAmount: number;
    depositAmount: number;
    balanceDue: number;
    variantName?: string;
    variantDescription?: string;
    freeSpots?: number;
  } | null>(null);
  // Marca qué campos ya fueron tocados para no mostrar error antes de tiempo.
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });
  // Hold ya creado: se muestran los datos para transferir la seña. La reserva
  // se confirma cuando llega el comprobante por WhatsApp (lo lee el bot).
  const [hold, setHold] = useState<HoldResponse | null>(null);

  // Días y turnos donde se puede reservar. No dependen de turnos precargados:
  // salen de los bloques fijos del día, así que hay agenda siempre que el local
  // abra. Se piden al backend cada vez que cambia la experiencia.
  useEffect(() => {
    if (!expId) return;
    let alive = true;
    setSlotsLoading(true);
    reservationsPublic
      .availability(expId)
      .then((rows) => {
        if (alive) setSlots(rows);
      })
      .catch(() => {
        if (alive) setSlots([]);
      })
      .finally(() => {
        if (alive) setSlotsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [expId]);

  const slotKey = (s: AvailableShift) => `${s.dateKey}|${s.startTime}`;

  const exp = experiences.find((e) => e._id === expId);
  const duration = exp?.durationMinutes ?? 120;
  /** Última hora de inicio que permite terminar antes del cierre. */
  const latestStart = fromMin(toMin(BUSINESS_CLOSE) - duration);

  // Valida la hora libre contra el salón real (mesas + limpieza) con un
  // pequeño debounce. El backend es la autoridad; esto es feedback temprano.
  useEffect(() => {
    if (!customDay || !customTime) {
      setCustomCheck({ status: 'idle' });
      return;
    }
    if (toMin(customTime) < toMin(BUSINESS_OPEN) || customTime > latestStart) {
      setCustomCheck({
        status: 'no',
        message: `Podés empezar entre las ${BUSINESS_OPEN} y las ${latestStart} (dura ${duration} min y cerramos ${BUSINESS_CLOSE}).`,
      });
      return;
    }
    let alive = true;
    setCustomCheck({ status: 'checking' });
    const t = setTimeout(() => {
      reservationsPublic
        .previewTables({
          experienceId: expId,
          date: customDay,
          startTime: customTime,
          quantity: 1,
        })
        .then((res) => {
          if (!alive) return;
          if (res.fits) {
            setCustomCheck({ status: 'ok', maxPartySize: res.maxPartySize });
            setSlotId('custom');
          } else {
            setCustomCheck({
              status: 'no',
              message:
                res.needsSharedConsent
                  ? 'A esa hora sólo queda mesa compartida: reservá por WhatsApp.'
                  : 'A esa hora no quedan mesas. Probá otro horario.',
            });
          }
        })
        .catch(() => {
          if (alive) {
            setCustomCheck({ status: 'no', message: 'No pudimos verificar ese horario.' });
          }
        });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [customDay, customTime, expId, duration, latestStart]);

  // Bloques agrupados por día (para la grilla): [{ key, header, slots }].
  const slotsByDay = useMemo(() => {
    const groups = new Map<string, AvailableShift[]>();
    for (const s of slots) {
      const k = s.dateKey;
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(s);
    }
    return [...groups.entries()].map(([key, rows]) => ({
      key,
      header: fmtDayHeader(rows[0].startAt),
      slots: rows,
    }));
  }, [slots]);

  // Reset del turno al cambiar de experiencia — pero NO en el mount inicial
  // (si no, el flujo del sheet limpia la selección recién hecha).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSlotId('');
    setCustomDay('');
    setCustomTime('');
    setCustomCheck({ status: 'idle' });
    setQty(1);
  }, [expId]);

  const suggested = slots.find((s) => slotKey(s) === slotId);
  // Hora libre validada: se arma un "slot" equivalente con los datos de la
  // experiencia (precio y seña salen de la plantilla, como en el backend).
  const custom =
    slotId === 'custom' && customCheck.status === 'ok' && exp && customDay && customTime
      ? {
          dateKey: customDay,
          startTime: customTime,
          startAt: isoAR(customDay, customTime),
          endAt: isoAR(customDay, fromMin(toMin(customTime) + duration)),
          maxPartySize: customCheck.maxPartySize ?? 12,
          price: exp.basePrice,
          depositPct: exp.depositPct ?? 50,
        }
      : null;
  const selected = suggested ?? custom;
  const maxQty = selected ? Math.max(1, selected.maxPartySize) : 12;
  const localTotal = selected ? selected.price * qty : 0;
  const depositPct = selected?.depositPct ?? 50;
  const total = srvPricing?.totalAmount ?? localTotal;
  const senia =
    srvPricing?.depositAmount ?? Math.round((total * depositPct) / 100);
  const saldo = srvPricing?.balanceDue ?? total - senia;
  const expName = experiences.find((e) => e._id === expId)?.name ?? 'Experiencia';
  const locked = !!lockedExperienceId;

  // Montos del negocio para el horario/grupo elegido (con promos y beneficios
  // de cumpleaños incluidos): el resumen muestra lo mismo que se va a cobrar.
  useEffect(() => {
    if (!expId || !selected) {
      setSrvPricing(null);
      return;
    }
    const { dateKey, startTime } = selected;
    let alive = true;
    const t = setTimeout(() => {
      reservationsPublic
        .previewTables({
          experienceId: expId,
          date: dateKey,
          startTime,
          quantity: qty,
          isBirthday: isBday || undefined,
        })
        .then((res) => {
          if (alive) setSrvPricing(res.pricing ?? null);
        })
        .catch(() => {
          if (alive) setSrvPricing(null);
        });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expId, selected?.dateKey, selected?.startTime, qty, isBday]);

  // Errores de formato de "Tus datos".
  const nameError = validateName(name);
  const emailError = validateEmail(email);
  const phoneError = validatePhone(phone);
  const dataValid = !nameError && !emailError && !phoneError;
  const canSubmit = !!selected && qty >= 1 && dataValid && !submitting;

  async function submit() {
    if (!selected) {
      setError('Elegí un horario disponible.');
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
      const created = await reservationsPublic.createHold({
        experienceId: expId,
        date: selected.dateKey,
        startTime: selected.startTime,
        quantity: qty,
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
        customerPhone: normalizedPhone || undefined,
        idempotencyKey: idemKey,
        isBirthday: isBday || undefined,
      });
      // No hay pasarela de pago: la seña se transfiere y el comprobante llega
      // por WhatsApp. Mostramos los datos bancarios en la misma pantalla.
      setHold(created);
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

  // Lugar apartado: falta que transfiera la seña y mande el comprobante.
  if (hold) {
    return (
      <TransferPanel
        hold={hold}
        experienceName={expName}
        when={selected ? fmtDate(selected.startAt) : ''}
        quantity={qty}
      />
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
            <StepLabel>Tu experiencia</StepLabel>
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
          <StepLabel>Elegí tu momento</StepLabel>
          {slotsLoading ? (
            <p className='flex items-center gap-2 border border-linea bg-arena px-4 py-3.5 text-sm text-piedra'>
              <Calendar className='h-[18px] w-[18px] text-terracota' />
              Buscando fechas disponibles…
            </p>
          ) : slots.length === 0 ? (
            <p className='flex items-center gap-2 border border-linea bg-arena px-4 py-3.5 text-sm text-piedra'>
              <Calendar className='h-[18px] w-[18px] text-terracota' />
              No hay turnos disponibles para esta experiencia.
            </p>
          ) : (
            <>
            <div className='sheet-scroll flex max-h-[340px] flex-col gap-5 overflow-y-auto lg:max-h-[420px]'>
              {slotsByDay.map((day) => (
                <div key={day.key} className='flex flex-col gap-2.5'>
                  <span className='font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ciruela-oscuro'>
                    {day.header}
                  </span>
                  <div className='flex flex-wrap gap-2'>
                    {day.slots.map((s) => {
                      const id = slotKey(s);
                      const on = id === slotId;
                      // "Quedan pocos" sólo cuando de verdad queda poco: el
                      // número es el grupo más grande que todavía entra.
                      const low = s.maxPartySize <= 4;
                      return (
                        <button
                          key={id}
                          type='button'
                          onClick={() => {
                            setSlotId(id);
                            setQty(1);
                          }}
                          className={`press flex w-32 flex-col items-center gap-1 border py-2.5 transition ${
                            on
                              ? 'border-terracota bg-terracota text-arena'
                              : 'border-linea bg-arena text-ciruela-oscuro hover:border-terracota/50'
                          }`}
                        >
                          <span className='font-playfair text-lg font-medium leading-none'>
                            {fmtTime(s.startAt)}
                          </span>
                          <span
                            className={`text-[11px] ${on ? 'text-arena/70' : 'text-piedra'}`}
                          >
                            {s.shiftName ?? 'Horario sugerido'}
                          </span>
                          {low && (
                            <span
                              className={`text-[11px] ${on ? 'text-arena/70' : 'font-medium text-terracota'}`}
                            >
                              hasta {s.maxPartySize}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Otro horario (libre): cualquier hora dentro de la ventana. */}
            <div
              className={`flex flex-col gap-2.5 border px-4 py-3.5 transition ${
                slotId === 'custom'
                  ? 'border-terracota bg-arena'
                  : 'border-linea bg-arena'
              }`}
            >
              <div className='flex items-center gap-2'>
                <Clock className='h-[16px] w-[16px] text-terracota' />
                <span className='font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ciruela-oscuro'>
                  ¿Preferís otro horario?
                </span>
              </div>
              <div className='flex flex-wrap items-center gap-3'>
                <select
                  value={customDay}
                  onChange={(e) => {
                    setCustomDay(e.target.value);
                    if (slotId !== 'custom') setSlotId('');
                  }}
                  className='border border-linea bg-arena px-3 py-2.5 text-sm text-ciruela-oscuro outline-none focus:border-terracota'
                >
                  <option value=''>Elegí el día</option>
                  {slotsByDay.map((day) => (
                    <option key={day.key} value={day.key}>
                      {day.header}
                    </option>
                  ))}
                </select>
                <input
                  type='time'
                  value={customTime}
                  min={BUSINESS_OPEN}
                  max={latestStart}
                  step={300}
                  disabled={!customDay}
                  onChange={(e) => {
                    setCustomTime(e.target.value);
                    if (slotId !== 'custom') setSlotId('');
                  }}
                  className='border border-linea bg-arena px-3 py-2 text-sm text-ciruela-oscuro outline-none focus:border-terracota disabled:opacity-40'
                />
                <span className='text-[12px] text-piedra'>
                  entre {BUSINESS_OPEN} y {latestStart}
                </span>
              </div>
              {customCheck.status === 'checking' && (
                <span className='text-[13px] text-piedra'>Verificando disponibilidad…</span>
              )}
              {customCheck.status === 'ok' && (
                <span className='text-[13px] font-medium text-verde-profundo'>
                  ¡Hay lugar!{' '}
                  {customCheck.maxPartySize
                    ? `Hasta ${customCheck.maxPartySize} personas a las ${customTime}.`
                    : ''}
                </span>
              )}
              {customCheck.status === 'no' && customCheck.message && (
                <span className='text-[13px] font-medium text-terracota'>
                  {customCheck.message}
                </span>
              )}
            </div>
            </>
          )}
        </div>

        {/* Personas */}
        <div className='flex flex-col gap-3.5'>
          <StepLabel>¿Quiénes te acompañan?</StepLabel>
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
              {selected ? `Hasta ${maxQty} en este horario` : 'Elegí un horario primero'}
            </span>
          </div>
        </div>

        {/* Datos */}
        <div className='flex flex-col gap-3.5'>
          <StepLabel>Dejanos tus datos</StepLabel>
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

          {/* Ocasión: cumpleaños. El negocio aplica los beneficios solos. */}
          <button
            type='button'
            onClick={() => setIsBday(!isBday)}
            aria-pressed={isBday}
            className={`relative flex w-full items-start gap-3 overflow-hidden border bg-white px-4 py-3.5 text-left transition ${
              isBday ? 'border-terracota' : 'border-linea'
            }`}
          >
            {/* Globos + serpentinas de fondo, sutiles para no tapar el texto */}
            <span
              aria-hidden
              className='pointer-events-none absolute inset-0 bg-repeat opacity-[0.22]'
              style={{
                backgroundImage: 'url(/serpentina.png)',
                backgroundSize: '150px',
              }}
            />
            <span
              className={`relative z-10 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border text-[11px] ${
                isBday
                  ? 'border-terracota bg-terracota text-arena'
                  : 'border-linea bg-white'
              }`}
            >
              {isBday ? '✓' : ''}
            </span>
            <span className='relative z-10 text-sm text-ciruela-oscuro'>
              Es un cumpleaños
              <span className='block text-[13px] leading-snug text-piedra'>
                Festejalo acá: según el día y el tamaño del grupo se aplican
                beneficios solos (regalos, lugares bonificados) y los ves
                reflejados en el resumen.
              </span>
            </span>
          </button>
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
        {srvPricing?.variantName && (
          <div className='border-b border-linea bg-arena px-6 py-3.5'>
            <p className='text-sm font-medium text-terracota'>
              ✨ {srvPricing.variantName}
            </p>
            {(srvPricing.variantDescription || srvPricing.freeSpots) && (
              <p className='mt-0.5 text-[13px] leading-snug text-piedra'>
                {srvPricing.freeSpots
                  ? `${srvPricing.freeSpots === 1 ? '1 lugar bonificado' : `${srvPricing.freeSpots} lugares bonificados`}: entran todos, pagás ${srvPricing.freeSpots} menos. `
                  : ''}
                {srvPricing.variantDescription ?? ''}
              </p>
            )}
          </div>
        )}
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
            Reservás transfiriendo la seña y mandándonos el comprobante por
            WhatsApp. El saldo lo completás en el local. Recibís un código de 6
            caracteres para gestionar tu reserva.
          </p>
        </div>
        <div className='p-4'>
          <button
            type='button'
            onClick={submit}
            disabled={!canSubmit}
            className='press flex w-full items-center justify-center gap-2.5 bg-naranja-medio px-6 py-[19px] font-mono text-sm uppercase tracking-[0.14em] text-ciruela-oscuro transition hover:brightness-95 disabled:opacity-50'
          >
            {submitting ? 'Apartando tu lugar…' : 'Confirmar reserva'}
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

// ─────────────────────── Seña por transferencia ───────────────────────

/**
 * Pantalla que sigue a la reserva. No hay pasarela de pago: el lugar queda
 * apartado unos minutos, la persona transfiere la seña y manda la captura por
 * WhatsApp. El bot la lee y ahí la reserva queda confirmada.
 */
function TransferPanel({
  hold,
  experienceName,
  when,
  quantity,
}: {
  hold: HoldResponse;
  experienceName: string;
  when: string;
  quantity: number;
}) {
  const waText = encodeURIComponent(
    `¡Hola! Acabo de reservar ${experienceName}${when ? ` (${when})` : ''} para ` +
      `${quantity} ${quantity === 1 ? 'persona' : 'personas'}. ` +
      'Te mando el comprobante de la seña.',
  );
  const waHref = hold.whatsapp
    ? `https://wa.me/${hold.whatsapp}?text=${waText}`
    : null;

  return (
    <div className='mx-auto flex max-w-xl flex-col gap-7 border border-linea bg-arena p-8'>
      <div className='flex flex-col gap-2'>
        <SectionLabel>Te apartamos el lugar</SectionLabel>
        <p className='text-[15px] leading-relaxed text-piedra'>
          Tenés <strong className='text-ciruela-oscuro'>{hold.holdMinutes} minutos</strong>{' '}
          para transferir la seña y mandarnos el comprobante. Pasado ese tiempo el
          lugar se libera y la reserva no queda confirmada.
        </p>
      </div>

      <div className='flex flex-col gap-1 border-l-2 border-terracota pl-4'>
        <span className='text-[15px] font-medium text-ciruela-oscuro'>
          {experienceName}
        </span>
        {when && <span className='text-sm text-piedra'>{when}</span>}
        <span className='text-sm text-piedra'>
          {quantity} {quantity === 1 ? 'persona' : 'personas'}
        </span>
      </div>

      <div className='flex flex-col gap-3 border border-linea bg-white p-5'>
        <Row label='Seña a transferir' value={fmtPrice(hold.depositAmount)} strong />
        <Row label='Saldo (se abona en el local)' value={fmtPrice(hold.balanceDue)} />
        <div className='my-1 h-px w-full bg-linea' />
        <CopyRow label='Alias' value={hold.transfer.alias} />
        <Row label='Titular' value={hold.transfer.ownerName} />
        <Row label='Banco' value={hold.transfer.bank} />
      </div>

      {waHref ? (
        <a
          href={waHref}
          target='_blank'
          rel='noopener noreferrer'
          className='press flex w-full items-center justify-center gap-2.5 bg-naranja-medio px-6 py-[19px] font-mono text-sm uppercase tracking-[0.14em] text-ciruela-oscuro transition hover:brightness-95'
        >
          Enviar comprobante
          <ArrowRight className='h-[18px] w-[18px]' />
        </a>
      ) : (
        <p className='text-sm text-piedra'>
          Mandanos la captura del comprobante por WhatsApp y confirmamos tu reserva.
        </p>
      )}

      <p className='text-xs leading-relaxed text-piedra'>
        Apenas leamos el comprobante te llega el código de reserva por WhatsApp. Si
        ya transferiste y el tiempo venció, escribinos igual: el pago no se pierde.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className='flex items-baseline justify-between gap-4'>
      <span className='text-sm text-piedra'>{label}</span>
      <span
        className={
          strong
            ? 'text-lg font-semibold text-ciruela-oscuro'
            : 'text-[15px] text-ciruela-oscuro'
        }
      >
        {value}
      </span>
    </div>
  );
}

/** El alias es lo único que la persona necesita copiar sin errores. */
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className='flex items-center justify-between gap-4'>
      <span className='text-sm text-piedra'>{label}</span>
      <button
        type='button'
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }}
        className='flex items-center gap-2 font-mono text-[15px] text-ciruela-oscuro transition hover:text-terracota'
        aria-label={`Copiar ${label}`}
      >
        {value}
        {copied ? (
          <Check className='h-4 w-4 text-terracota' />
        ) : (
          <Copy className='h-4 w-4 text-piedra' />
        )}
      </button>
    </div>
  );
}
