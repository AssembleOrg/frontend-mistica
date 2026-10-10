'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Plus,
  Users,
  Wallet,
  Flame,
  Banknote,
  Armchair,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AR_TZ,
  arDayEndISO,
  arDayStartISO,
  fmtPrice,
  prettyCode,
  RESERVATION_STATUS_LABEL,
  SESSION_STATUS_LABEL,
} from '@/lib/reservas-format';
import { DEFAULT_EXPERIENCE_COLOR } from '@/lib/experience-colors';
import {
  reservationsAdmin,
  type AdminExperience,
  type AdminSession,
  type ReservationItem,
} from '@/services/reservations.admin.service';
import { AnotadosModal } from './anotados-modal';
import { CollectBalanceModal, NewReservationModal, ReservasListado } from './reservas-list';
import { ReservasCalendar } from './reservas-calendar';
import { ReservationManager } from './reservation-manager';
import { DietaryTags } from './dietary-badge';
import { useAuth } from '@/hooks/useAuth';
import { allowedReservasTabs, canManageRole, canSeeReservationDetails } from '@/lib/views';
import { NewPieceModal } from './piezas-tab';
import { tallerAdmin, type GroupDayClass } from '@/services/taller.admin.service';
import { tablesAdmin, type TableStatus } from '@/services/tables.admin.service';

// ─────────────────────────── helpers de fecha (AR) ───────────────────────────

function ymdInAR(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: AR_TZ });
}
function todayYmd(): string {
  return ymdInAR(new Date());
}
function atNoonUTC(ymd: string): Date {
  return new Date(`${ymd}T12:00:00Z`);
}
function addDays(ymd: string, days: number): string {
  const d = atNoonUTC(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function mondayOf(ymd: string): string {
  const dow = atNoonUTC(ymd).getUTCDay();
  return addDays(ymd, dow === 0 ? -6 : 1 - dow);
}
function hourAR(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: AR_TZ,
  });
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_CORTOS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

function longDayLabel(ymd: string): string {
  const dt = atNoonUTC(ymd);
  return `${DIAS[dt.getUTCDay()]} ${Number(ymd.slice(8, 10))} de ${MESES[Number(ymd.slice(5, 7)) - 1]}`;
}

function chipClasses(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'opacity-100';
    case 'CLOSED':
      return 'opacity-55';
    case 'DRAFT':
      return 'opacity-70 border-dashed';
    default:
      return 'opacity-40 line-through';
  }
}

type Mode = 'day' | 'week' | 'month' | 'list';

// Mismo día del mes ±N meses (anclado al 1 para no desbordar meses cortos).
function addMonths(ymd: string, delta: number): string {
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7)) - 1 + delta;
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Pestaña Reservas: una sola vista para todo. Día y Semana son la agenda
 * (una card por reserva, con sus acciones); Lista es el
 * listado completo con buscador, filtros e historial. "Nueva reserva" está
 * siempre a mano.
 */
export function ReservasTab() {
  const { user } = useAuth();
  const router = useRouter();
  // Cocina y cuentas con pestañas sueltas: cuántas personas y qué restricciones,
  // sin nombres de clientes ni importes (el backend tampoco los manda). Tampoco
  // ven el listado completo ni cargan reservas.
  const verDetalle = canSeeReservationDetails(user?.role, user?.allowedViews);
  const [mode, setMode] = useState<Mode>('day');
  const [newOpen, setNewOpen] = useState(false);
  const [experiences, setExperiences] = useState<AdminExperience[]>([]);
  // Reserva abierta desde el calendario mensual.
  const [detail, setDetail] = useState<ReservationItem | null>(null);
  const [anchor, setAnchor] = useState<string>(todayYmd());
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [attendees, setAttendees] = useState<Record<string, ReservationItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [anotados, setAnotados] = useState<string | null>(null);
  // Cargar piezas desde la tarjeta de la reserva.
  const [piecesOf, setPiecesOf] = useState<ReservationItem | null>(null);
  const canPieces = allowedReservasTabs(user?.role, user?.allowedViews).includes('piezas');
  // Cobrar: registra el cobro en la reserva (no pasa por Ventas ni por caja).
  const canCobrar = canManageRole(user?.role);
  const [cobrando, setCobrando] = useState<ReservationItem | null>(null);
  const [clases, setClases] = useState<GroupDayClass[]>([]);
  const [tick, setTick] = useState(0);

  const hoy = todayYmd();

  // Experiencias para el alta manual (una vez, sólo si puede cargar).
  useEffect(() => {
    if (!verDetalle) return;
    reservationsAdmin
      .listExperiences(false)
      .then(setExperiences)
      .catch(() => {});
  }, [verDetalle]);

  const { from, to, gridDays } = useMemo(() => {
    if (mode !== 'week') {
      return { from: anchor, to: anchor, gridDays: [anchor] };
    }
    const start = mondayOf(anchor);
    const end = addDays(start, 6);
    const days: string[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    return { from: start, to: end, gridDays: days };
  }, [mode, anchor]);

  const load = useCallback(async () => {
    // En Lista y Mes, cada vista carga lo suyo.
    if (mode === 'list' || mode === 'month') return;
    setLoading(true);
    try {
      const all = await reservationsAdmin.listSessions({
        // Límites del día AR como instante UTC, derivados de la zona IANA
        // (mismo mecanismo que el resto de la app, sin offset hardcodeado).
        from: arDayStartISO(from),
        to: arDayEndISO(to),
        includePast: true,
      });
      // Un turno sin nadie anotado (se canceló todo) no se muestra.
      const list = all.filter((s) => s.seatsTaken > 0 || (s.confirmedSeats ?? 0) > 0);
      setSessions(list);
      // En vista día, traemos los anotados de cada turno para mostrar nombres y
      // el saldo por cobrar. Son pocos turnos por día, así que es liviano.
      if (mode === 'day') {
        const pairs = await Promise.all(
          list.map((s) =>
            reservationsAdmin
              .attendees(s.id)
              .then((r) => [s.id, r.reservations] as const)
              .catch(() => [s.id, [] as ReservationItem[]] as const),
          ),
        );
        setAttendees(Object.fromEntries(pairs));
      } else {
        setAttendees({});
      }
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar la agenda');
    } finally {
      setLoading(false);
    }
  }, [from, to, mode]);

  // Clases del taller del día (sólo cantidad de alumnos, sin nombres). Si la
  // cuenta no tiene acceso, la sección simplemente no se muestra.
  useEffect(() => {
    if (mode !== 'day') return setClases([]);
    let alive = true;
    tallerAdmin
      .groupsOfDay(anchor)
      .then((rows) => alive && setClases(rows))
      .catch(() => alive && setClases([]));
    return () => {
      alive = false;
    };
  }, [mode, anchor]);

  useEffect(() => {
    load();
  }, [load, tick]);

  const byDay = useMemo(() => {
    const map = new Map<string, AdminSession[]>();
    for (const s of sessions) {
      const key = ymdInAR(s.startAt);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return map;
  }, [sessions]);

  // Las reservas de una experiencia que va a un grupo del taller (Escuelita)
  // se ven en "Taller de este día", no como un turno aparte. Si hay alguna sin
  // confirmar, el turno se sigue mostrando para que no pase desapercibida.
  const tallerExperiences = useMemo(
    () => new Set(clases.flatMap((c) => c.experienceIds ?? [])),
    [clases],
  );
  const dayTurnos = (byDay.get(anchor) ?? []).filter(
    (s) =>
      !tallerExperiences.has(s.experienceId) ||
      (attendees[s.id] ?? []).some((r) => r.status === 'PENDING' || r.status === 'NEEDS_REVIEW'),
  );

  // Reloj para "en el salón ahora": se refresca cada minuto.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Personas confirmadas (sin holds pendientes) de los turnos en curso. En
  // otro día que no es hoy no hay "ahora": se muestra el total del día.
  const isToday = anchor === todayYmd();
  const personas = useMemo(
    () =>
      dayTurnos
        .filter(
          (s) =>
            !isToday ||
            (Date.parse(s.startAt) <= now && now < Date.parse(s.endAt)),
        )
        .reduce((n, s) => n + (s.confirmedSeats ?? s.seatsTaken), 0),
    [dayTurnos, isToday, now],
  );

  // Mesas libres ahora (sólo hoy): las que no tienen una reserva o un bloqueo
  // en curso, contando la limpieza. Se vuelve a pedir cada 5 minutos.
  const [mesas, setMesas] = useState<TableStatus[] | null>(null);
  const cincoMin = Math.floor(now / 300_000);
  useEffect(() => {
    if (mode !== 'day' || !isToday) return setMesas(null);
    let alive = true;
    tablesAdmin
      .agenda(anchor)
      .then((a) => alive && setMesas(a.tables))
      .catch(() => alive && setMesas(null));
    return () => {
      alive = false;
    };
  }, [mode, anchor, isToday, tick, cincoMin]);
  const mesasLibres = useMemo(() => {
    if (!mesas?.length) return null;
    const ocupada = (t: TableStatus) =>
      t.holders.some((h) => {
        const start = h.startAt ? Date.parse(h.startAt) : NaN;
        const end = Date.parse(h.busyUntil ?? h.endAt ?? '');
        // Un bloqueo sin horario ocupa la mesa todo el día.
        if (Number.isNaN(start) || Number.isNaN(end)) return true;
        return start <= now && now < end;
      });
    return mesas.filter((t) => !ocupada(t)).length;
  }, [mesas, now]);

  // Una card por reserva (no por turno): así "Cobrar" es siempre de ESA
  // reserva. Las que ya terminaron o se cancelaron van abajo, en gris, para
  // que quien llega vea qué pasó antes en el día.
  const { activas, pasadas } = useMemo(() => {
    const rows = dayTurnos
      .flatMap((s) =>
        (attendees[s.id] ?? [])
          .filter(
            (r) =>
              !tallerExperiences.has(s.experienceId) ||
              r.status === 'PENDING' ||
              r.status === 'NEEDS_REVIEW',
          )
          .map((r) => ({ r, s, phase: reservaPhase(r, s, anchor, now) })),
      )
      .sort((a, b) => a.s.startAt.localeCompare(b.s.startAt));
    const terminada = (p: Phase) => p === 'done' || p === 'cancelled';
    return {
      activas: rows.filter((x) => !terminada(x.phase)),
      // Lo último que pasó, primero.
      pasadas: rows.filter((x) => terminada(x.phase)).reverse(),
    };
  }, [dayTurnos, attendees, tallerExperiences, anchor, now]);

  const renderReserva = ({ r, s, phase }: (typeof activas)[number]) => (
    <ReservaCard
      key={r._id}
      reservation={r}
      session={s}
      phase={phase}
      verDetalle={verDetalle}
      onOpen={() => (verDetalle ? setDetail(r) : setAnotados(s.id))}
      onPieces={canPieces && r.status === 'CONFIRMED' ? () => setPiecesOf(r) : undefined}
      onCobrar={
        canCobrar && r.status === 'CONFIRMED' && (r.balanceDue ?? 0) > 0
          ? () => setCobrando(r)
          : undefined
      }
    />
  );

  function move(delta: number) {
    if (mode === 'month') return setAnchor(addMonths(anchor, delta));
    setAnchor(mode === 'day' ? addDays(anchor, delta) : addDays(mondayOf(anchor), delta * 7));
  }

  const monthLabel = `${MESES[Number(anchor.slice(5, 7)) - 1]} ${anchor.slice(0, 4)}`;

  return (
    <div className='flex flex-col gap-5'>
      {/* Barra: navegación de fecha (agenda) + toggle Día/Semana/Lista + alta */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        {mode === 'list' ? (
          <h2 className='font-tan-nimbus text-xl font-semibold text-[#455a54] sm:text-[22px]'>
            Todas las reservas
          </h2>
        ) : (
        <div className='flex items-center gap-2.5'>
          <button
            type='button'
            onClick={() => move(-1)}
            className='inline-flex size-8 items-center justify-center rounded-lg border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
            aria-label='Anterior'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>
          <button
            type='button'
            onClick={() => move(1)}
            className='inline-flex size-8 items-center justify-center rounded-lg border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
            aria-label='Siguiente'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
          <h2 className='font-tan-nimbus text-xl font-semibold capitalize text-[#455a54] sm:text-[22px]'>
            {mode === 'day'
              ? longDayLabel(anchor)
              : mode === 'month'
                ? monthLabel
                : `Semana del ${Number(from.slice(8, 10))}/${Number(from.slice(5, 7))}`}
          </h2>
          <button
            type='button'
            onClick={() => setAnchor(todayYmd())}
            className='rounded-lg border border-[#e6dbcd] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#3d3338] hover:bg-[#fbf5ef]'
          >
            Hoy
          </button>
          {/* Spinner con ancho fijo: no empuja el layout al aparecer/desaparecer. */}
          <Loader2
            className={cn(
              'h-4 w-4 shrink-0 animate-spin text-[#9d684e] transition-opacity',
              loading ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden={!loading}
          />
        </div>
        )}
        <div className='flex items-center gap-2.5'>
          <div className='inline-flex items-center rounded-[11px] border border-[#e6dbcd] bg-[#fbf5ef] p-1'>
            {(
              [
                ['day', 'Día'],
                ['week', 'Semana'],
                ['month', 'Mes'],
                ...(verDetalle ? ([['list', 'Lista']] as const) : []),
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type='button'
                onClick={() => setMode(m)}
                className={cn(
                  'rounded-lg px-3 py-2 text-[13px] font-medium transition-colors sm:px-4',
                  mode === m ? 'bg-[#455a54] text-white' : 'text-[#7a6e6f] hover:text-[#455a54]',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {verDetalle && (
            <Button
              type='button'
              variant='verde'
              className='shrink-0 gap-2'
              onClick={() => setNewOpen(true)}
              aria-label='Nueva reserva'
            >
              <Plus className='h-4 w-4' />
              {/* En mobile sólo el +: con el texto no entra junto al selector. */}
              <span className='hidden sm:inline'>Nueva reserva</span>
            </Button>
          )}
        </div>
      </div>

      {mode === 'list' ? (
        <ReservasListado refreshKey={tick} />
      ) : mode === 'month' ? (
        <ReservasCalendar
          anchor={anchor}
          hideHeader
          refreshKey={tick}
          onOpen={verDetalle ? setDetail : undefined}
          onOpenDay={(ymd) => {
            setAnchor(ymd);
            setMode('day');
          }}
        />
      ) : mode === 'day' ? (
        <>
          <div className='flex items-stretch divide-x divide-[#e6dbcd] overflow-hidden rounded-2xl border border-[#e6dbcd] bg-white'>
            <Stat
              icon={Users}
              value={String(personas)}
              label={isToday ? 'personas en el salón ahora' : 'personas en el día'}
            />
            {mesasLibres !== null && mesas && (
              <Stat
                icon={Armchair}
                value={`${mesasLibres} de ${mesas.length}`}
                label='mesas libres ahora'
              />
            )}
          </div>

          {/* Reservas del día: una card por reserva */}
          {activas.length === 0 && pasadas.length === 0 ? (
            <div className='rounded-2xl border border-[#e6dbcd] bg-white p-8 text-center text-sm text-[#7a6e6f]'>
              No hay reservas este día.
            </div>
          ) : (
            <>
              {activas.length > 0 && (
                <div className='grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3'>
                  {activas.map(renderReserva)}
                </div>
              )}
              {pasadas.length > 0 && (
                <div className='flex flex-col gap-2.5'>
                  {activas.length > 0 && (
                    <h3 className='text-[13px] font-semibold uppercase tracking-wide text-[#9a9a9a]'>
                      Ya pasaron hoy · {pasadas.length}
                    </h3>
                  )}
                  <div className='grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-3'>
                    {pasadas.map(renderReserva)}
                  </div>
                </div>
              )}
            </>
          )}
          {clases.length > 0 && (
            <div className='flex flex-col gap-2.5'>
              <div className='flex items-baseline justify-between gap-3'>
                <h3 className='font-tan-nimbus text-[17px] font-semibold text-[#3d3338]'>
                  Taller de este día
                </h3>
                <span className='text-[13px] text-[#7a6e6f]'>
                  {clases.reduce((n, c) => n + c.students, 0)} alumno(s) en{' '}
                  {clases.length} clase(s)
                </span>
              </div>
              <div className='grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
                {clases.map((c) => (
                  <button
                    key={c.groupId}
                    type='button'
                    onClick={() =>
                      router.push(
                        `/dashboard/alumnos?tab=grupos&group=${c.groupId}`,
                      )
                    }
                    title='Abrir el grupo y su asistencia'
                    className='group flex items-center justify-between gap-3 rounded-2xl border border-[#e6dbcd] bg-white px-4 py-3 text-left transition-shadow hover:shadow-[0_2px_12px_rgba(69,90,84,0.08)]'
                  >
                    <span className='flex min-w-0 flex-col leading-tight'>
                      <span className='truncate text-sm font-semibold text-[#3d3338]'>
                        {c.name}
                      </span>
                      <span className='text-xs text-[#7a6e6f]'>
                        {c.start}–{c.end}
                        {c.professorName ? ` · ${c.professorName}` : ''}
                      </span>
                    </span>
                    <span className='flex shrink-0 items-center gap-2'>
                      {(c.trials ?? 0) > 0 && (
                        <span
                          className='rounded-full border border-dashed border-[#cc844a]/50 bg-[#F6E9DC] px-2 py-0.5 text-[11px] font-semibold text-[#cc844a]'
                          title='Vienen a una clase de prueba'
                        >
                          +{c.trials} prueba
                        </span>
                      )}
                      {(c.makeups ?? 0) > 0 && (
                        <span
                          className='rounded-full border border-dashed border-[#6d5a78]/40 bg-[#efe9f2] px-2 py-0.5 text-[11px] font-semibold text-[#6d5a78]'
                          title='Alumnos de otros grupos que vienen a recuperar'
                        >
                          +{c.makeups} recupera
                        </span>
                      )}
                      {(c.extras ?? 0) > 0 && (
                        <span
                          className='rounded-full border border-dashed border-[#6d5a78]/40 bg-[#efe9f2] px-2 py-0.5 text-[11px] font-semibold text-[#6d5a78]'
                          title='Alumnos de otros grupos que suman esta clase (doble turno)'
                        >
                          +{c.extras} extra
                        </span>
                      )}
                      {(c.away ?? 0) > 0 && (
                        <span
                          className='rounded-full border border-[#e6dbcd] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#7a6e6f]'
                          title='Avisaron que no vienen: recuperan otro día'
                        >
                          −{c.away} no viene
                        </span>
                      )}
                      <span className='inline-flex items-center gap-1.5 rounded-full border border-[#e6dbcd] bg-[#fbf5ef] px-2.5 py-1'>
                        <Users className='h-3.5 w-3.5 text-[#455a54]' />
                        <span className='font-mono text-xs font-semibold text-[#3d3338]'>
                          {c.students}
                        </span>
                      </span>
                      <span className='inline-flex items-center gap-1 text-xs font-medium text-[#7a6e6f] group-hover:text-[#455a54]'>
                        <ClipboardList className='h-3.5 w-3.5' />
                        <ArrowRight className='h-3.5 w-3.5' />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <WeekAgenda gridDays={gridDays} byDay={byDay} hoy={hoy} onVer={setAnotados} />
      )}

      {piecesOf && (
        <NewPieceModal
          reservation={piecesOf}
          onClose={() => setPiecesOf(null)}
          onDone={() => {
            setPiecesOf(null);
            setTick((t) => t + 1);
          }}
        />
      )}

      {cobrando && (
        <CollectBalanceModal
          reservation={cobrando}
          onClose={() => setCobrando(null)}
          onDone={() => {
            setCobrando(null);
            setTick((t) => t + 1);
          }}
        />
      )}

      {anotados && (
        <AnotadosModal
          sessionId={anotados}
          onClose={() => setAnotados(null)}
          onChanged={() => setTick((t) => t + 1)}
        />
      )}

      <ReservationManager
        reservation={detail}
        onClose={() => setDetail(null)}
        onChanged={() => setTick((t) => t + 1)}
      />

      {newOpen && (
        <NewReservationModal
          experiences={experiences}
          onClose={() => setNewOpen(false)}
          onDone={() => {
            setNewOpen(false);
            setTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}

// Un segmento del resumen: ícono + valor + label, condensado y responsive.
function Stat({
  icon: Icon,
  value,
  label,
  title,
  color = '#455a54',
}: {
  icon: typeof Users;
  value: string;
  label: string;
  title?: string;
  color?: string;
}) {
  return (
    <div className='flex min-w-0 flex-1 items-center gap-2.5 px-3 py-3 sm:px-4' title={title}>
      <Icon className='h-4 w-4 shrink-0 sm:h-[18px] sm:w-[18px]' style={{ color }} />
      <span className='flex min-w-0 flex-col leading-tight'>
        <span className='truncate font-tan-nimbus text-lg font-semibold text-[#3d3338] sm:text-xl'>
          {value}
        </span>
        <span className='truncate text-[11px] text-[#7a6e6f] sm:text-xs'>{label}</span>
      </span>
    </div>
  );
}

// ─────────────────────────── Card de UNA reserva ───────────────────────────

type Phase = 'pending' | 'upcoming' | 'live' | 'done' | 'cancelled';

/** En qué momento está la reserva respecto del día que se mira y la hora. */
/** Fin real de la reserva: el del turno más la hora extra, si tiene. */
function reservaEnd(r: ReservationItem, s: AdminSession): number {
  return Date.parse(s.endAt) + (r.extraMinutes ?? 0) * 60_000;
}

function reservaPhase(
  r: ReservationItem,
  s: AdminSession,
  dayYmd: string,
  now: number,
): Phase {
  if (r.status === 'CANCELLED' || r.status === 'EXPIRED') return 'cancelled';
  const end = reservaEnd(r, s);
  const today = todayYmd();
  if (dayYmd < today || (dayYmd === today && end <= now)) return 'done';
  if (r.status !== 'CONFIRMED') return 'pending';
  return dayYmd === today && Date.parse(s.startAt) <= now ? 'live' : 'upcoming';
}

/** Barra de estado: mismos colores que los pedidos de shop-antony. */
const PHASE_UI: Record<Phase, { label: string; bg: string; fg: string }> = {
  pending: { label: 'Sin confirmar', bg: '#fdf0dc', fg: '#b45309' },
  upcoming: { label: 'Confirmada', bg: '#e6effd', fg: '#1d4ed8' },
  live: { label: 'En el salón ahora', bg: '#e4f4ea', fg: '#15803d' },
  done: { label: 'Ya pasó', bg: '#eeeff1', fg: '#4b5563' },
  cancelled: { label: 'Cancelada', bg: '#fbe6e6', fg: '#b91c1c' },
};

function ReservaCard({
  reservation: r,
  session: s,
  phase,
  verDetalle,
  onOpen,
  onPieces,
  onCobrar,
}: {
  reservation: ReservationItem;
  session: AdminSession;
  phase: Phase;
  verDetalle: boolean;
  onOpen: () => void;
  /** Cargar piezas de esta reserva (si la cuenta tiene Piezas). */
  onPieces?: () => void;
  /** Cobrar el saldo de esta reserva (sólo admin). */
  onCobrar?: () => void;
}) {
  const ui = PHASE_UI[phase];
  const label =
    phase === 'cancelled'
      ? (RESERVATION_STATUS_LABEL[r.status] ?? ui.label)
      : phase === 'done' && r.status !== 'CONFIRMED'
        ? 'No se confirmó'
        : ui.label;
  const apagada = phase === 'done' || phase === 'cancelled';
  const color = s.experienceColor ?? DEFAULT_EXPERIENCE_COLOR;
  const saldo = r.balanceDue ?? 0;
  const total = r.totalAmount ?? r.amount;

  return (
    // div (no <button>): adentro van los botones de cobrar / piezas.
    <div
      role='button'
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        'flex cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition-shadow hover:shadow-[0_2px_12px_rgba(69,90,84,0.08)]',
        apagada ? 'border-[#e5e5e5] bg-[#f7f7f7] opacity-75' : 'border-[#e6dbcd] bg-white',
      )}
    >
      {/* Barra de ESTADO: color + texto, y el horario a la derecha. */}
      <span
        className='flex items-center justify-between gap-2 px-4 py-1.5 text-xs font-extrabold'
        style={{ backgroundColor: ui.bg, color: ui.fg }}
      >
        {label}
        <span className='shrink-0 font-mono font-semibold'>
          {hourAR(s.startAt)} – {hourAR(new Date(reservaEnd(r, s)).toISOString())}
        </span>
      </span>

      <div className='flex flex-1 flex-col gap-2.5 px-4 pb-3 pt-3'>
        <span className='break-words font-tan-nimbus text-[19px] font-semibold leading-tight text-[#3d3338]'>
          {verDetalle ? (r.customerName ?? prettyCode(r.code)) : `${r.quantity} persona(s)`}
        </span>

        {/* Cinta de EXPERIENCIA: sale del borde izquierdo y termina en punta. */}
        <span
          className={cn(
            '-ml-4 flex w-fit max-w-[calc(100%+1rem)] items-center gap-1.5 bg-[#fbf5ef] py-1 pl-4 pr-3.5 text-xs font-bold text-[#3d3338]',
            apagada && 'bg-[#ececec]',
          )}
          style={{
            clipPath:
              'polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)',
          }}
        >
          <span
            className='h-2.5 w-2.5 shrink-0 rounded-full'
            style={{ backgroundColor: color }}
          />
          <span className='truncate'>{s.experienceName}</span>
        </span>
        {s.specialName && (
          <span className='inline-flex w-fit items-center rounded-full bg-[#F6E9DC] px-2.5 py-0.5 text-xs font-semibold text-[#9d684e]'>
            ✨ {s.specialName}
          </span>
        )}

        <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#3d3338]'>
          {verDetalle && (
            <span className='inline-flex items-center gap-1.5'>
              <Users className='h-3.5 w-3.5 text-[#455a54]' />
              {r.quantity} pers.
            </span>
          )}
          {(r.tableCodes?.length ?? 0) > 0 && (
            <span className='inline-flex items-center gap-1.5'>
              <Armchair className='h-3.5 w-3.5 text-[#455a54]' />
              {r.tableCodes!.join(', ')}
            </span>
          )}
          {r.isBirthday && <span>🎂 Cumple</span>}
        </div>

        <DietaryTags tags={r.dietaryTags} notes={r.dietaryNotes} compact />

        {verDetalle && total != null && (
          <div className='mt-auto flex items-center justify-between gap-2 pt-1'>
            <span className='font-tan-nimbus text-lg font-semibold text-[#3d3338]'>
              {fmtPrice(total)}
            </span>
            {phase === 'cancelled' ? null : saldo > 0 ? (
              <span className='inline-flex items-center gap-1 rounded-full bg-[#fbe2d8] px-2.5 py-1 text-[11px] font-bold text-[#c2410c]'>
                <Wallet className='h-3 w-3' />
                Debe {fmtPrice(saldo)}
              </span>
            ) : (
              <span className='inline-flex items-center gap-1 rounded-full bg-[#e4f4ea] px-2.5 py-1 text-[11px] font-bold text-[#15803d]'>
                <CalendarCheck className='h-3 w-3' />
                Pagado
              </span>
            )}
          </div>
        )}
      </div>

      {(onCobrar || onPieces) && (
        <div className='flex gap-2 px-3 pb-3'>
          {onCobrar && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                onCobrar();
              }}
              onKeyDown={(e) => e.stopPropagation()}
              className='flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#455a54] text-sm font-bold text-white transition-colors hover:bg-[#455a54]/90'
            >
              <Banknote className='h-4 w-4' />
              Cobrar {fmtPrice(saldo)}
            </button>
          )}
          {onPieces && (
            <button
              type='button'
              title='Cargar piezas de esta reserva'
              onClick={(e) => {
                e.stopPropagation();
                onPieces();
              }}
              onKeyDown={(e) => e.stopPropagation()}
              className={cn(
                'flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#e6dbcd] bg-[#fbf5ef] px-3 text-sm font-semibold text-[#9d684e] transition-colors hover:bg-[#f3e9de]',
                !onCobrar && 'flex-1',
              )}
            >
              <Flame className='h-4 w-4' />
              Piezas
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────── Vista SEMANA ───────────────────────────────

function WeekAgenda({
  gridDays,
  byDay,
  hoy,
  onVer,
}: {
  gridDays: string[];
  byDay: Map<string, AdminSession[]>;
  hoy: string;
  onVer: (sessionId: string) => void;
}) {
  return (
    <>
    {/* Mobile: días apilados (sólo con turnos), sin scroll horizontal. */}
    <div className='flex flex-col gap-3 sm:hidden'>
      {gridDays.every((d) => (byDay.get(d) ?? []).length === 0) ? (
        <div className='rounded-2xl border border-[#e6dbcd] bg-white p-8 text-center text-sm text-[#7a6e6f]'>
          No hay turnos esta semana.
        </div>
      ) : (
        gridDays.map((ymd, i) => {
          const turnos = byDay.get(ymd) ?? [];
          if (turnos.length === 0) return null;
          const isToday = ymd === hoy;
          return (
            <div key={ymd} className='flex flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                    isToday ? 'bg-[#455a54] text-white' : 'bg-[#fbf5ef] text-[#455a54]',
                  )}
                >
                  {DIAS_CORTOS[i]} {Number(ymd.slice(8, 10))}/{Number(ymd.slice(5, 7))}
                </span>
                <span className='text-xs text-[#7a6e6f]'>{turnos.length} turno(s)</span>
              </div>
              <div className='flex flex-col gap-2'>
                {turnos.map((s) => (
                  <WeekTurnoChip key={s.id} session={s} onVer={onVer} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>

    {/* Desktop/tablet: grilla semanal de 7 columnas. */}
    <div className='hidden overflow-x-auto rounded-2xl border border-[#e6dbcd] bg-white sm:block'>
      <div className='grid min-w-[64rem] grid-cols-7'>
        {gridDays.map((ymd, i) => {
          const turnos = byDay.get(ymd) ?? [];
          const isToday = ymd === hoy;
          return (
            <div
              key={ymd}
              className={cn(
                'flex min-h-[16rem] flex-col border-r border-[#f1ede6] last:border-r-0',
                isToday && 'bg-[#E7F0EC]/40',
              )}
            >
              <div
                className={cn(
                  'border-b border-[#e6dbcd] px-2 py-2 text-center',
                  isToday ? 'bg-[#455a54] text-white' : 'bg-[#fbf5ef] text-[#455a54]',
                )}
              >
                <p className='font-mono text-[11px] tracking-wider'>{DIAS_CORTOS[i]}</p>
                <p className='text-sm font-semibold'>
                  {Number(ymd.slice(8, 10))}/{Number(ymd.slice(5, 7))}
                </p>
              </div>
              <div className='flex flex-col gap-1.5 p-1.5'>
                {turnos.length === 0 && (
                  <p className='px-1 py-2 text-center text-[11px] text-[#455a54]/35'>—</p>
                )}
                {turnos.map((s) => (
                  <WeekTurnoChip key={s.id} session={s} onVer={onVer} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}

// Chip de un turno en la vista semana (reusado por la grilla desktop y la lista
// apilada de mobile).
function WeekTurnoChip({
  session: s,
  onVer,
}: {
  session: AdminSession;
  onVer: (sessionId: string) => void;
}) {
  const color = s.experienceColor ?? DEFAULT_EXPERIENCE_COLOR;
  return (
    <button
      type='button'
      onClick={() => onVer(s.id)}
      className={cn(
        'rounded-xl border border-[#e6dbcd] bg-white p-2 text-left transition-shadow hover:shadow-[0_2px_10px_rgba(69,90,84,0.08)]',
        chipClasses(s.status),
      )}
    >
      <p className='flex items-center gap-1.5 font-mono text-[11px] text-[#455a54]'>
        <span
          className='h-2 w-2 shrink-0 rounded-full'
          style={{ backgroundColor: color }}
        />
        {hourAR(s.startAt)}–{hourAR(s.endAt)}
      </p>
      <p className='mt-1 truncate text-xs font-medium text-[#3d3338]' title={s.experienceName}>
        {s.experienceName}
      </p>
      {s.specialName && (
        <p className='truncate text-[11px] font-semibold text-[#9d684e]' title={s.specialName}>
          ✨ {s.specialName}
        </p>
      )}
      <p className='mt-0.5 flex items-center justify-between text-xs text-[#455a54]/70'>
        <span>{s.confirmedSeats ?? s.seatsTaken} pers.</span>
        <span className='font-mono uppercase tracking-wide'>
          {SESSION_STATUS_LABEL[s.status] ?? s.status}
        </span>
      </p>
    </button>
  );
}
