'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  AR_TZ,
  arDayEndISO,
  arDayStartISO,
  fmtPrice,
  SESSION_STATUS_LABEL,
} from '@/lib/reservas-format';
import { DEFAULT_EXPERIENCE_COLOR } from '@/lib/experience-colors';
import {
  reservationsAdmin,
  type AdminSession,
  type ReservationItem,
} from '@/services/reservations.admin.service';
import { AnotadosModal } from './anotados-modal';

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

export function AgendaTab() {
  const [mode, setMode] = useState<'day' | 'week'>('day');
  const [anchor, setAnchor] = useState<string>(todayYmd());
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [attendees, setAttendees] = useState<Record<string, ReservationItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [anotados, setAnotados] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const hoy = todayYmd();

  const { from, to, gridDays } = useMemo(() => {
    if (mode === 'day') {
      return { from: anchor, to: anchor, gridDays: [anchor] };
    }
    const start = mondayOf(anchor);
    const end = addDays(start, 6);
    const days: string[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    return { from: start, to: end, gridDays: days };
  }, [mode, anchor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await reservationsAdmin.listSessions({
        // Límites del día AR como instante UTC, derivados de la zona IANA
        // (mismo mecanismo que el resto de la app, sin offset hardcodeado).
        from: arDayStartISO(from),
        to: arDayEndISO(to),
        includePast: true,
      });
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

  const dayTurnos = byDay.get(anchor) ?? [];

  // Resumen del día: turnos, personas y saldo por cobrar en el local.
  const stats = useMemo(() => {
    const personas = dayTurnos.reduce((n, s) => n + s.seatsTaken, 0);
    let porCobrar = 0;
    for (const s of dayTurnos) {
      for (const r of attendees[s.id] ?? []) {
        if (r.status === 'CONFIRMED' && r.balanceDue) porCobrar += r.balanceDue;
      }
    }
    return { turnos: dayTurnos.length, personas, porCobrar };
  }, [dayTurnos, attendees]);

  function move(delta: number) {
    setAnchor(mode === 'day' ? addDays(anchor, delta) : addDays(mondayOf(anchor), delta * 7));
  }

  return (
    <div className='flex flex-col gap-5'>
      {/* Barra de día + toggle Día/Semana */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
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
              : `Semana del ${Number(from.slice(8, 10))}/${Number(from.slice(5, 7))}`}
          </h2>
          <button
            type='button'
            onClick={() => setAnchor(todayYmd())}
            className='rounded-lg border border-[#e6dbcd] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#3d3338] hover:bg-[#fbf5ef]'
          >
            Hoy
          </button>
          {loading && <span className='text-xs text-[#7a6e6f]'>cargando…</span>}
        </div>
        <div className='inline-flex items-center rounded-[11px] border border-[#e6dbcd] bg-[#fbf5ef] p-1'>
          {(
            [
              ['day', 'Día'],
              ['week', 'Semana'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type='button'
              onClick={() => setMode(m)}
              className={cn(
                'rounded-lg px-4 py-2 text-[13px] font-medium transition-colors',
                mode === m ? 'bg-[#455a54] text-white' : 'text-[#7a6e6f] hover:text-[#455a54]',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'day' ? (
        <>
          {/* Resumen del día */}
          <div className='grid grid-cols-1 gap-3.5 sm:grid-cols-3'>
            <StatCard icon={Ticket} value={String(stats.turnos)} label='turnos' />
            <StatCard icon={Users} value={String(stats.personas)} label='personas' />
            <StatCard
              icon={Wallet}
              value={fmtPrice(stats.porCobrar)}
              label='por cobrar en el local'
              color='#9d684e'
            />
          </div>

          {/* Turnos del día */}
          {dayTurnos.length === 0 ? (
            <div className='rounded-2xl border border-[#e6dbcd] bg-white p-8 text-center text-sm text-[#7a6e6f]'>
              No hay turnos este día.
            </div>
          ) : (
            <div className='flex flex-col gap-3.5'>
              {dayTurnos.map((s) => (
                <TurnoCard
                  key={s.id}
                  session={s}
                  reservations={attendees[s.id] ?? []}
                  onVer={() => setAnotados(s.id)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <WeekAgenda gridDays={gridDays} byDay={byDay} hoy={hoy} onVer={setAnotados} />
      )}

      {anotados && (
        <AnotadosModal
          sessionId={anotados}
          onClose={() => setAnotados(null)}
          onChanged={() => setTick((t) => t + 1)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  color = '#455a54',
}: {
  icon: typeof Ticket;
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <div className='flex items-center gap-3 rounded-2xl border border-[#e6dbcd] bg-white p-4'>
      <span className='inline-flex size-10 items-center justify-center rounded-[10px] bg-[#fbf5ef]'>
        <Icon className='h-[19px] w-[19px]' style={{ color }} />
      </span>
      <span className='flex flex-col'>
        <span className='font-tan-nimbus text-[22px] font-semibold text-[#3d3338]'>{value}</span>
        <span className='text-xs text-[#7a6e6f]'>{label}</span>
      </span>
    </div>
  );
}

function TurnoCard({
  session: s,
  reservations,
  onVer,
}: {
  session: AdminSession;
  reservations: ReservationItem[];
  onVer: () => void;
}) {
  const names = reservations.map((r) => ({ name: r.customerName, saldo: (r.balanceDue ?? 0) > 0 }));
  const shown = names.slice(0, 3);
  const extra = Math.max(0, s.seatsTaken - shown.length);
  const porCobrar = reservations.reduce(
    (n, r) => n + (r.status === 'CONFIRMED' ? r.balanceDue ?? 0 : 0),
    0,
  );

  return (
    <div className='flex overflow-hidden rounded-2xl border border-[#e6dbcd] bg-white'>
      <div className='flex w-[120px] shrink-0 flex-col justify-center gap-0.5 border-r border-[#e6dbcd] bg-[#fbf5ef] p-[18px]'>
        <span className='font-tan-nimbus text-2xl font-semibold text-[#455a54]'>
          {hourAR(s.startAt)}
        </span>
        <span className='text-xs text-[#7a6e6f]'>a {hourAR(s.endAt)}</span>
      </div>
      <div className='flex min-w-0 flex-1 flex-col gap-2.5 p-4'>
        <div className='flex items-center justify-between gap-3'>
          <span className='truncate font-tan-nimbus text-[17px] font-semibold text-[#3d3338]'>
            {s.experienceName}
          </span>
          <span className='inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#e6dbcd] bg-[#fbf5ef] px-2.5 py-1'>
            <Users className='h-3.5 w-3.5 text-[#455a54]' />
            <span className='font-mono text-xs font-semibold text-[#3d3338]'>
              {s.seatsTaken}/{s.capacity}
            </span>
          </span>
        </div>
        {shown.length > 0 && (
          <div className='flex flex-wrap items-center gap-1.5'>
            {shown.map((a, i) => (
              <span
                key={i}
                className='inline-flex items-center gap-1.5 rounded-full border border-[#e6dbcd] bg-[#fbf5ef] px-2.5 py-1 text-xs font-medium text-[#3d3338]'
              >
                {a.saldo && <span className='h-1.5 w-1.5 rounded-full bg-[#9d684e]' />}
                {a.name}
              </span>
            ))}
            {extra > 0 && (
              <span className='text-xs font-medium text-[#7a6e6f]'>+{extra} más</span>
            )}
          </div>
        )}
        <div className='h-px w-full bg-[#e6dbcd]' />
        <div className='flex items-center justify-between gap-2'>
          {porCobrar > 0 ? (
            <span className='inline-flex items-center gap-1.5 text-[13px] font-medium text-[#9d684e]'>
              <Wallet className='h-[15px] w-[15px]' />
              Por cobrar {fmtPrice(porCobrar)} en el local
            </span>
          ) : (
            <span className='inline-flex items-center gap-1.5 text-[13px] font-medium text-[#455a54]'>
              <CalendarCheck className='h-[15px] w-[15px]' />
              Todo cobrado
            </span>
          )}
          <button
            type='button'
            onClick={onVer}
            className='inline-flex items-center gap-1.5 rounded-[9px] border border-[#e6dbcd] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#455a54] hover:bg-[#fbf5ef]'
          >
            Ver turno
            <ArrowRight className='h-3.5 w-3.5' />
          </button>
        </div>
      </div>
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
    <div className='overflow-x-auto rounded-2xl border border-[#e6dbcd] bg-white'>
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
                {turnos.map((s) => {
                  const color = s.experienceColor ?? DEFAULT_EXPERIENCE_COLOR;
                  return (
                    <button
                      key={s.id}
                      type='button'
                      onClick={() => onVer(s.id)}
                      className={cn(
                        'rounded-lg border border-[#f1ede6] border-l-4 p-1.5 text-left',
                        chipClasses(s.status),
                      )}
                      style={{ borderLeftColor: color, backgroundColor: `${color}14` }}
                    >
                      <p className='font-mono text-[11px] text-[#455a54]'>
                        {hourAR(s.startAt)}–{hourAR(s.endAt)}
                      </p>
                      <p className='truncate text-xs font-medium text-[#3d3338]' title={s.experienceName}>
                        {s.experienceName}
                      </p>
                      <p className='mt-0.5 flex items-center justify-between text-xs text-[#455a54]/70'>
                        <span>{s.seatsTaken}/{s.capacity} pers.</span>
                        <span className='font-mono uppercase tracking-wide'>
                          {SESSION_STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
