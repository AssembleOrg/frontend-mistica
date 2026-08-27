'use client';

// Vista Calendario de Reservas (estilo Google Calendar). Desktop: grilla mensual
// con las reservas como chips de color por estado. Mobile: grilla compacta con
// puntos + lista del día seleccionado. Fiel al diseño del .pen.
//
// El endpoint de reservas NO filtra por rango de fechas, así que traemos un lote
// amplio (limit alto) y agrupamos por día en el cliente. El volumen real de un
// taller de cerámica es bajo, así que esto cubre el mes con holgura.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  AR_TZ,
  RESERVATION_STATUS_COLOR,
  RESERVATION_STATUS_LABEL,
} from '@/lib/reservas-format';
import {
  reservationsAdmin,
  type ReservationItem,
} from '@/services/reservations.admin.service';
import { closedDatesAdmin } from '@/services/closed-dates.admin.service';

const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// ISO (UTC) -> 'YYYY-MM-DD' en hora de Argentina (para agrupar por día).
function arYmd(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

// ISO (UTC) -> 'HH:mm' en hora de Argentina.
function arHm(iso: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: AR_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

// 'YYYY-MM-DD' de hoy en Argentina.
function todayYmd(): string {
  return arYmd(new Date().toISOString());
}

// 'YYYY-MM-DD' + N días (aritmética anclada a mediodía UTC, el día no se corre).
function addYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

type Cell = {
  ymd: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
};

// Construye las 5-6 semanas (empezando lunes) que cubren el mes Y/M.
function buildWeeks(year: number, month: number): Cell[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const firstWeekday = (first.getUTCDay() + 6) % 7; // 0 = lunes
  const start = new Date(first);
  start.setUTCDate(1 - firstWeekday);
  const today = todayYmd();

  const weeks: Cell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const y = cursor.getUTCFullYear();
      const m = String(cursor.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getUTCDate()).padStart(2, '0');
      const ymd = `${y}-${m}-${dd}`;
      week.push({
        ymd,
        day: cursor.getUTCDate(),
        inMonth: cursor.getUTCMonth() === month,
        isToday: ymd === today,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
    // Cortamos en 5 semanas si la 6ta cae toda fuera del mes.
    if (w === 4 && week.every((c) => !c.inMonth)) break;
  }
  return weeks;
}

type DayItem = { r: ReservationItem; hm: string };

export function ReservasCalendar({
  experienceId,
  onOpen,
  refreshKey,
}: {
  experienceId?: string;
  onOpen?: (r: ReservationItem) => void;
  refreshKey?: number;
}) {
  const now = new Date();
  const [year, setYear] = useState(() =>
    Number(
      new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ, year: 'numeric' }).format(now),
    ),
  );
  const [month, setMonth] = useState(() =>
    Number(
      new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ, month: '2-digit' }).format(now),
    ) - 1,
  );
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(() => todayYmd());
  // Días cerrados por FECHA puntual (ymd -> motivo). Sólo cierres de tipo 'DATE':
  // las reglas semanales NO se pintan (un domingo puntual puede estar abierto).
  const [closed, setClosed] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let alive = true;
    closedDatesAdmin
      .list()
      .then((list) => {
        const m = new Map<string, string>();
        for (const c of list) {
          if (c.kind !== 'DATE' || !c.from) continue;
          const end = c.to || c.from;
          let d = c.from;
          for (let guard = 0; d <= end && guard < 400; guard++) {
            m.set(d, c.reason || '');
            d = addYmd(d, 1);
          }
        }
        if (alive) setClosed(m);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reservationsAdmin.listReservations({
        experienceId: experienceId || undefined,
        limit: 500,
      });
      setItems(res.items);
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar el calendario');
    } finally {
      setLoading(false);
    }
  }, [experienceId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const weeks = useMemo(() => buildWeeks(year, month), [year, month]);

  // Reservas por día (YYYY-MM-DD), ordenadas por hora, sin las canceladas/vencidas.
  const byDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    for (const r of items) {
      if (r.status === 'CANCELLED' || r.status === 'EXPIRED') continue;
      const ymd = arYmd(r.startAt);
      const arr = map.get(ymd) ?? [];
      arr.push({ r, hm: arHm(r.startAt) });
      map.set(ymd, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.hm.localeCompare(b.hm));
    return map;
  }, [items]);

  function shift(delta: number) {
    const m = month + delta;
    const y = year + Math.floor(m / 12);
    setMonth(((m % 12) + 12) % 12);
    setYear(y);
  }

  function goToday() {
    const t = todayYmd();
    const [y, m] = t.split('-').map(Number);
    setYear(y);
    setMonth(m - 1);
    setSelected(t);
  }

  const monthLabel = `${MESES[month]} ${year}`;
  const monthCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className='flex flex-col gap-4'>
      {/* Barra de mes */}
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5'>
          <button
            type='button'
            onClick={() => shift(-1)}
            className='inline-flex size-8 items-center justify-center rounded-lg border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
            aria-label='Mes anterior'
          >
            <ChevronLeft className='h-4 w-4' />
          </button>
          <button
            type='button'
            onClick={() => shift(1)}
            className='inline-flex size-8 items-center justify-center rounded-lg border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
            aria-label='Mes siguiente'
          >
            <ChevronRight className='h-4 w-4' />
          </button>
          <h2 className='font-tan-nimbus text-xl font-semibold text-[#455a54] sm:text-[22px]'>
            {monthCap}
          </h2>
          <button
            type='button'
            onClick={goToday}
            className='rounded-lg border border-[#e6dbcd] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#3d3338] hover:bg-[#fbf5ef]'
          >
            Hoy
          </button>
        </div>
        <div className='hidden items-center gap-4 sm:flex'>
          {(['CONFIRMED', 'PENDING', 'NEEDS_REVIEW'] as const).map((s) => (
            <span key={s} className='flex items-center gap-1.5'>
              <span
                className='h-2 w-2 rounded-full'
                style={{ backgroundColor: RESERVATION_STATUS_COLOR[s][1] }}
              />
              <span className='text-xs text-[#7a6e6f]'>{RESERVATION_STATUS_LABEL[s]}</span>
            </span>
          ))}
          <span className='flex items-center gap-1.5'>
            <span className='h-2.5 w-2.5 rounded-[3px] bg-[#ece6dd]' />
            <span className='text-xs text-[#7a6e6f]'>Cerrado</span>
          </span>
        </div>
      </div>

      {/* Desktop: grilla mensual */}
      <div className='hidden overflow-hidden rounded-2xl border border-[#e6dbcd] bg-white md:block'>
        <div className='grid grid-cols-7 bg-[#fbf5ef]'>
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className='py-2.5 text-center font-mono text-[11px] font-medium tracking-wider text-[#7a6e6f]'
            >
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className='grid grid-cols-7'>
            {week.map((cell, di) => {
              const evs = byDay.get(cell.ymd) ?? [];
              const isClosed = closed.has(cell.ymd);
              const reason = closed.get(cell.ymd) || '';
              return (
                <div
                  key={cell.ymd}
                  title={isClosed ? `Cerrado${reason ? `: ${reason}` : ''}` : undefined}
                  className={cn(
                    'flex min-h-[128px] flex-col gap-1 p-1.5',
                    di < 6 && 'border-r border-[#e6dbcd]',
                    wi < weeks.length - 1 && 'border-b border-[#e6dbcd]',
                    !cell.inMonth && 'bg-[#fbf5ef]/60',
                    isClosed && 'bg-[#ece6dd]',
                  )}
                >
                  <div className='flex items-center gap-1.5 px-1 pt-0.5'>
                    {cell.isToday ? (
                      <span className='inline-flex size-[22px] items-center justify-center rounded-full bg-[#455a54] text-xs font-semibold text-white'>
                        {cell.day}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'text-[13px] font-medium',
                          cell.inMonth ? 'text-[#3d3338]' : 'text-[#7a6e6f]',
                        )}
                      >
                        {cell.day}
                      </span>
                    )}
                    {isClosed && (
                      <span className='truncate text-xs font-medium text-[#7a6e6f]'>
                        cerrado
                      </span>
                    )}
                  </div>
                  {evs.slice(0, 2).map(({ r, hm }) => {
                    const [bg, fg] = RESERVATION_STATUS_COLOR[r.status] ?? ['#f1ede6', '#7a6e6f'];
                    return (
                      <button
                        key={r._id}
                        type='button'
                        onClick={() => onOpen?.(r)}
                        className='flex items-center gap-1.5 overflow-hidden rounded-[5px] px-1.5 py-1 text-left'
                        style={{ backgroundColor: bg }}
                        title={`${hm} · ${r.experienceName} · ${r.customerName}`}
                      >
                        <span
                          className='h-1.5 w-1.5 shrink-0 rounded-full'
                          style={{ backgroundColor: fg }}
                        />
                        <span
                          className='truncate text-xs font-medium'
                          style={{ color: fg }}
                        >
                          {hm} {r.experienceName}
                        </span>
                      </button>
                    );
                  })}
                  {evs.length > 2 && (
                    <span className='px-1 text-xs font-medium text-[#7a6e6f]'>
                      +{evs.length - 2} más
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Mobile: grilla compacta + lista del día */}
      <div className='md:hidden'>
        <div className='rounded-2xl border border-[#e6dbcd] bg-white p-2'>
          <div className='grid grid-cols-7'>
            {WEEKDAYS_SHORT.map((d, i) => (
              <div
                key={i}
                className='py-1 text-center font-mono text-[10px] font-medium text-[#7a6e6f]'
              >
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className='grid grid-cols-7'>
              {week.map((cell) => {
                const evs = byDay.get(cell.ymd) ?? [];
                const on = cell.ymd === selected;
                const isClosed = closed.has(cell.ymd);
                return (
                  <button
                    key={cell.ymd}
                    type='button'
                    onClick={() => setSelected(cell.ymd)}
                    className={cn(
                      'flex h-[46px] flex-col items-center justify-center gap-0.5 rounded-md',
                      isClosed && 'bg-[#ece6dd]',
                    )}
                  >
                    {cell.isToday || on ? (
                      <span
                        className={cn(
                          'inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                          on ? 'bg-[#455a54] text-white' : 'text-[#3d3338] ring-1 ring-[#455a54]',
                        )}
                      >
                        {cell.day}
                      </span>
                    ) : (
                      <span
                        className={cn(
                          'text-xs font-medium',
                          cell.inMonth ? 'text-[#3d3338]' : 'text-[#7a6e6f]',
                        )}
                      >
                        {cell.day}
                      </span>
                    )}
                    <span className='flex h-[5px] items-center gap-0.5'>
                      {evs.slice(0, 3).map(({ r }) => {
                        const fg = (RESERVATION_STATUS_COLOR[r.status] ?? ['', '#7a6e6f'])[1];
                        return (
                          <span
                            key={r._id}
                            className='h-1 w-1 rounded-full'
                            style={{ backgroundColor: fg }}
                          />
                        );
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Lista del día seleccionado */}
        <div className='mt-3 flex flex-col gap-2'>
          <p className='text-sm font-semibold capitalize text-[#3d3338]'>
            {selectedLabel(selected)}
          </p>
          {closed.has(selected) && (
            <p className='rounded-xl bg-[#ece6dd] px-3 py-2 text-xs font-medium text-[#7a6e6f]'>
              Local cerrado este día{closed.get(selected) ? ` · ${closed.get(selected)}` : ''}.
            </p>
          )}
          {(byDay.get(selected) ?? []).length === 0 ? (
            <p className='rounded-xl border border-[#e6dbcd] bg-white p-4 text-sm text-[#7a6e6f]'>
              Sin reservas este día.
            </p>
          ) : (
            (byDay.get(selected) ?? []).map(({ r, hm }) => {
              const [, fg] = RESERVATION_STATUS_COLOR[r.status] ?? ['#f1ede6', '#7a6e6f'];
              return (
                <button
                  key={r._id}
                  type='button'
                  onClick={() => onOpen?.(r)}
                  className='flex items-center gap-3 rounded-xl border border-[#e6dbcd] bg-white p-3 text-left'
                >
                  <span
                    className='h-[34px] w-1 shrink-0 rounded-full'
                    style={{ backgroundColor: fg }}
                  />
                  <span className='shrink-0 font-mono text-[13px] font-semibold text-[#455a54]'>
                    {hm}
                  </span>
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-medium text-[#3d3338]'>
                      {r.experienceName}
                    </span>
                    <span className='block truncate text-xs text-[#7a6e6f]'>
                      {r.customerName} · {r.quantity} pers.
                    </span>
                  </span>
                  <ChevronRight className='h-4 w-4 shrink-0 text-[#7a6e6f]' />
                </button>
              );
            })
          )}
        </div>
      </div>

      {loading && items.length === 0 && (
        <p className='text-sm text-[#7a6e6f]'>Cargando calendario…</p>
      )}
    </div>
  );
}

function selectedLabel(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return `${dias[dt.getUTCDay()]} ${d} de ${MESES[m - 1]}`;
}
