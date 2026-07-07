'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AR_TZ, SESSION_STATUS_LABEL } from '@/lib/reservas-format';
import { DEFAULT_EXPERIENCE_COLOR } from '@/lib/experience-colors';
import {
  reservationsAdmin,
  type AdminSession,
} from '@/services/reservations.admin.service';

// ─────────────────────────── helpers de fecha (AR) ───────────────────────────
// Todo el calendario opera sobre strings 'YYYY-MM-DD' en hora de Argentina para
// no depender de la zona del navegador. Los cálculos de aritmética de días se
// anclan a mediodía UTC (el día calendario no cambia con la TZ ahí).

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

/** Lunes (ISO) de la semana a la que pertenece `ymd`. */
function mondayOf(ymd: string): string {
  const dow = atNoonUTC(ymd).getUTCDay(); // 0=domingo
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
const DIAS_CORTOS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

// Estilo por estado del turno: el COLOR identifica a la experiencia; el estado
// se lee por la intensidad (abierto pleno, cerrado apagado, borrador punteado).
function chipClasses(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'opacity-100';
    case 'CLOSED':
      return 'opacity-55';
    case 'DRAFT':
      return 'opacity-70 border-dashed';
    default: // CANCELLED
      return 'opacity-40 line-through';
  }
}

export function AgendaTab() {
  const [mode, setMode] = useState<'month' | 'week'>('month');
  // Ancla de navegación: cualquier día del mes/semana visible.
  const [anchor, setAnchor] = useState<string>(todayYmd());
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);

  const hoy = todayYmd();
  const [anchorY, anchorM] = [
    Number(anchor.slice(0, 4)),
    Number(anchor.slice(5, 7)),
  ];

  // Rango visible (incluye los días de relleno de la grilla del mes).
  const { gridDays, from, to, title } = useMemo(() => {
    if (mode === 'month') {
      const first = `${anchor.slice(0, 7)}-01`;
      const daysInMonth = new Date(Date.UTC(anchorY, anchorM, 0)).getUTCDate();
      const start = mondayOf(first);
      const last = addDays(first, daysInMonth - 1);
      // Completar la última semana hasta domingo.
      const end = addDays(mondayOf(last), 6);
      const days: string[] = [];
      for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
      return {
        gridDays: days,
        from: start,
        to: end,
        title: `${MESES[anchorM - 1]} ${anchorY}`,
      };
    }
    const start = mondayOf(anchor);
    const end = addDays(start, 6);
    const days: string[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
    const fmt = (ymd: string) => `${Number(ymd.slice(8, 10))}/${Number(ymd.slice(5, 7))}`;
    return {
      gridDays: days,
      from: start,
      to: end,
      title: `Semana del ${fmt(start)} al ${fmt(end)} · ${anchorY}`,
    };
  }, [mode, anchor, anchorY, anchorM]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await reservationsAdmin.listSessions({
        // Bordes del rango en hora AR (el backend filtra por startAt).
        from: `${from}T00:00:00.000-03:00`,
        to: `${to}T23:59:59.999-03:00`,
        includePast: true,
      });
      setSessions(list);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar la agenda');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, AdminSession[]>();
    for (const s of sessions) {
      const key = ymdInAR(s.startAt);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startAt.localeCompare(b.startAt));
    }
    return map;
  }, [sessions]);

  // Leyenda: experiencias presentes en el rango, con su color actual.
  const legend = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sessions) {
      if (!map.has(s.experienceName)) {
        map.set(s.experienceName, s.experienceColor ?? DEFAULT_EXPERIENCE_COLOR);
      }
    }
    return [...map.entries()];
  }, [sessions]);

  function move(delta: number) {
    if (mode === 'month') {
      const m = anchorM - 1 + delta;
      const y = anchorY + Math.floor(m / 12);
      setAnchor(`${y}-${String(((m % 12) + 12) % 12 + 1).padStart(2, '0')}-01`);
    } else {
      setAnchor(addDays(mondayOf(anchor), delta * 7));
    }
  }

  const navBtn =
    'size-8 border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]';

  return (
    <div className='flex flex-col gap-4'>
      {/* Toolbar: navegación + título + cambio de vista */}
      <div className='flex flex-wrap items-center gap-2'>
        <div className='flex items-center gap-1.5'>
          <Button type='button' variant='outline' size='icon' className={navBtn} onClick={() => move(-1)} title='Anterior'>
            <ChevronLeft className='h-4 w-4' />
          </Button>
          <Button type='button' variant='outline' size='icon' className={navBtn} onClick={() => move(1)} title='Siguiente'>
            <ChevronRight className='h-4 w-4' />
          </Button>
          <Button
            type='button'
            variant='outline'
            className='h-8 border-[#e6dbcd] bg-white px-3 text-xs text-[#455a54] hover:bg-[#fbf5ef]'
            onClick={() => setAnchor(todayYmd())}
          >
            Hoy
          </Button>
        </div>
        <h2 className='text-base font-semibold capitalize text-[#455a54]'>
          {title}
          {loading && <span className='ml-2 text-xs font-normal text-[#455a54]/50'>cargando…</span>}
        </h2>
        <div className='ml-auto flex rounded-full border border-[#e6dbcd] bg-white p-0.5'>
          {(['month', 'week'] as const).map((m) => (
            <button
              key={m}
              type='button'
              onClick={() => setMode(m)}
              className={cn(
                'rounded-full px-4 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors',
                mode === m
                  ? 'bg-[#455a54] text-white'
                  : 'text-[#455a54]/70 hover:text-[#455a54]',
              )}
            >
              {m === 'month' ? 'Mes' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'month' ? (
        <MonthGrid gridDays={gridDays} byDay={byDay} hoy={hoy} anchorMonth={anchor.slice(0, 7)} onDayClick={(d) => { setAnchor(d); setMode('week'); }} />
      ) : (
        <WeekAgenda gridDays={gridDays} byDay={byDay} hoy={hoy} />
      )}

      {/* Leyenda: experiencias (color) + estados (intensidad) */}
      <div className='flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-[#e6dbcd] bg-white px-4 py-3'>
        {legend.length === 0 && !loading && (
          <span className='text-xs text-[#455a54]/60'>Sin turnos en este rango.</span>
        )}
        {legend.map(([name, color]) => (
          <span key={name} className='inline-flex items-center gap-1.5 text-xs text-[#455a54]'>
            <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: color }} />
            {name}
          </span>
        ))}
        {legend.length > 0 && (
          <span className='ml-auto font-mono text-[10px] uppercase tracking-wider text-[#455a54]/50'>
            pleno = abierto · apagado = cerrado · punteado = borrador
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────── Vista MES ───────────────────────────────

function MonthGrid({
  gridDays,
  byDay,
  hoy,
  anchorMonth,
  onDayClick,
}: {
  gridDays: string[];
  byDay: Map<string, AdminSession[]>;
  hoy: string;
  anchorMonth: string; // 'YYYY-MM'
  onDayClick: (ymd: string) => void;
}) {
  const MAX_CHIPS = 3;
  return (
    <div className='overflow-x-auto rounded-xl border border-[#e6dbcd] bg-white'>
      <div className='min-w-[56rem]'>
        <div className='grid grid-cols-7 border-b border-[#e6dbcd] bg-[#fbf5ef]'>
          {DIAS_CORTOS.map((d) => (
            <div key={d} className='px-2 py-2 text-center font-mono text-[11px] tracking-wider text-[#455a54]/60'>
              {d}
            </div>
          ))}
        </div>
        <div className='grid grid-cols-7'>
          {gridDays.map((ymd) => {
            const inMonth = ymd.startsWith(anchorMonth);
            const turnos = byDay.get(ymd) ?? [];
            const isToday = ymd === hoy;
            return (
              <button
                key={ymd}
                type='button'
                onClick={() => onDayClick(ymd)}
                title='Ver semana'
                className={cn(
                  'flex min-h-[6.5rem] flex-col gap-1 border-b border-r border-[#f1ede6] p-1.5 text-left align-top transition-colors last:border-r-0 hover:bg-[#fbf5ef]/60',
                  !inMonth && 'bg-[#faf8f4]',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    isToday
                      ? 'bg-[#455a54] font-semibold text-white'
                      : inMonth
                        ? 'text-[#455a54]'
                        : 'text-[#455a54]/35',
                  )}
                >
                  {Number(ymd.slice(8, 10))}
                </span>
                {turnos.slice(0, MAX_CHIPS).map((s) => {
                  const color = s.experienceColor ?? DEFAULT_EXPERIENCE_COLOR;
                  return (
                    <span
                      key={s.id}
                      title={`${s.experienceName} · ${hourAR(s.startAt)}–${hourAR(s.endAt)} · ${SESSION_STATUS_LABEL[s.status] ?? s.status} · ${s.seatsTaken}/${s.capacity}`}
                      className={cn(
                        'flex items-center gap-1 truncate rounded border-l-2 px-1 py-0.5 text-[10px] leading-tight text-[#3d3338]',
                        chipClasses(s.status),
                      )}
                      style={{ borderLeftColor: color, backgroundColor: `${color}22` }}
                    >
                      <span className='font-mono'>{hourAR(s.startAt)}</span>
                      <span className='truncate'>{s.experienceName}</span>
                    </span>
                  );
                })}
                {turnos.length > MAX_CHIPS && (
                  <span className='px-1 text-[10px] text-[#455a54]/60'>
                    +{turnos.length - MAX_CHIPS} más
                  </span>
                )}
              </button>
            );
          })}
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
}: {
  gridDays: string[];
  byDay: Map<string, AdminSession[]>;
  hoy: string;
}) {
  return (
    <div className='overflow-x-auto rounded-xl border border-[#e6dbcd] bg-white'>
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
                    <div
                      key={s.id}
                      className={cn(
                        'rounded-lg border border-[#f1ede6] border-l-4 p-1.5',
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
                      <p className='mt-0.5 flex items-center justify-between text-[10px] text-[#455a54]/70'>
                        <span>{s.seatsTaken}/{s.capacity} pers.</span>
                        <span className='font-mono uppercase tracking-wide'>
                          {SESSION_STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      </p>
                    </div>
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
