'use client';

import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  reservationsAdmin,
  type AdminExperience,
} from '@/services/reservations.admin.service';
import {
  reservationsPublic,
  type AvailableShift,
} from '@/services/reservations.public.service';
import { useBusinessHours } from '@/hooks/useBusinessHours';

export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const fmtDayChip = (dateKey: string) => {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const wd = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'][d.getUTCDay()];
  return `${wd} ${dateKey.slice(8, 10)}/${dateKey.slice(5, 7)}`;
};

/** Días desde hoy hasta el último del mes siguiente (así entra el mes entero). */
const daysUntilEndOfNextMonth = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  return Math.round((end.getTime() - today.getTime()) / 86_400_000);
};

type Check = {
  status: 'idle' | 'checking' | 'ok' | 'no';
  maxPartySize?: number;
  message?: string;
};

/**
 * Estado del turno a reservar: experiencia → día con lugar → hora sugerida o
 * libre (verificada en vivo contra las mesas). Lo usan el alta de reserva y el
 * "Agendar" de una venta del local.
 */
export function useSlotPicker(
  experiences: AdminExperience[],
  initialExpId = '',
  /** Hora extra en minutos: alarga la reserva (y el último inicio posible). */
  extraMinutes = 0,
) {
  const [expId, setExpId] = useState(initialExpId);
  const [slots, setSlots] = useState<AvailableShift[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [day, setDay] = useState('');
  /** Hora elegida: una sugerida del día o la libre tipeada. */
  const [time, setTime] = useState('');
  const [freeTime, setFreeTime] = useState('');
  const [check, setCheck] = useState<Check>({ status: 'idle' });

  // Horario del salón (configurable en Mesas; el backend es el que valida).
  const hours = useBusinessHours();
  const exp = experiences.find((e) => e._id === expId) ?? null;
  const baseDuration = exp?.durationMinutes ?? 120;
  // Con hora extra, la reserva dura más y tiene que empezar antes.
  const duration = baseDuration + extraMinutes;
  const latestStart = fromMin(toMin(hours.close) - duration);

  // Días y horarios sugeridos con lugar, agrupados por día.
  useEffect(() => {
    if (!expId) {
      setSlots([]);
      setDay('');
      return;
    }
    let alive = true;
    setSlotsLoading(true);
    reservationsPublic
      .availability(expId, daysUntilEndOfNextMonth())
      .then((rows) => {
        if (!alive) return;
        setSlots(rows);
        setDay((d) => d || rows[0]?.dateKey || '');
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

  useEffect(() => {
    setTime('');
    setFreeTime('');
    setCheck({ status: 'idle' });
  }, [expId, day]);

  const days = useMemo(() => {
    const seen = new Map<string, AvailableShift>();
    for (const sl of slots) {
      if (!seen.has(sl.dateKey)) seen.set(sl.dateKey, sl);
    }
    return [...seen.values()];
  }, [slots]);
  const daySlots = useMemo(
    () => slots.filter((sl: AvailableShift) => sl.dateKey === day),
    [slots, day],
  );
  const selectedSlot = daySlots.find((sl) => sl.startTime === time) ?? null;

  // Hora libre: verificación EN VIVO contra las mesas (con limpieza y cierre).
  useEffect(() => {
    if (!expId || !day || !freeTime) {
      if (!time) setCheck({ status: 'idle' });
      return;
    }
    if (toMin(freeTime) < toMin(hours.open) || freeTime > latestStart) {
      setCheck({
        status: 'no',
        message: `Podés empezar entre las ${hours.open} y las ${latestStart} (dura ${duration} min, cerramos ${hours.close}).`,
      });
      return;
    }
    let alive = true;
    setCheck({ status: 'checking' });
    const t = setTimeout(() => {
      // Verificación del panel: la reserva puede cruzar de un turno al otro
      // (de 17 a 20) y sumar hora extra.
      reservationsAdmin
        .previewTables({
          experienceId: expId,
          date: day,
          startTime: freeTime,
          quantity: 1,
          ...(extraMinutes > 0 && { extraMinutes }),
        })
        .then((res) => {
          if (!alive) return;
          if (res.fits) {
            setCheck({ status: 'ok', maxPartySize: res.maxPartySize });
            setTime(freeTime);
          } else {
            setCheck({
              status: 'no',
              message: 'A esa hora no quedan mesas. Probá otro horario.',
            });
          }
        })
        .catch((e) => {
          // El motivo real (no entra en el horario, horario propio…), no uno genérico.
          if (alive)
            setCheck({
              status: 'no',
              message:
                e instanceof Error && e.message
                  ? e.message
                  : 'No se pudo verificar ese horario.',
            });
        });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [freeTime, expId, day, duration, latestStart, hours.open, extraMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxParty = selectedSlot
    ? selectedSlot.maxPartySize
    : check.status === 'ok'
      ? (check.maxPartySize ?? 12)
      : null;
  const unit = selectedSlot?.price ?? exp?.basePrice ?? 0;

  return {
    expId,
    setExpId,
    exp,
    duration,
    hours,
    latestStart,
    slotsLoading,
    days,
    day,
    setDay,
    daySlots,
    selectedSlot,
    time,
    setTime,
    freeTime,
    setFreeTime,
    check,
    setCheck,
    maxParty,
    unit,
  };
}

export type SlotPickerState = ReturnType<typeof useSlotPicker>;

const field =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';
const chip = (on: boolean) =>
  cn(
    'rounded-lg border px-3 py-2 text-[13px] font-semibold transition-colors',
    on
      ? 'border-[#455a54] bg-[#455a54] text-white'
      : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
  );

/** Experiencia, día y horario. */
export function SlotPicker({
  picker,
  experiences,
  experienceLabel = 'Experiencia',
}: {
  picker: SlotPickerState;
  experiences: AdminExperience[];
  experienceLabel?: string;
}) {
  const {
    expId,
    setExpId,
    duration,
    latestStart,
    slotsLoading,
    days,
    day,
    setDay,
    daySlots,
    selectedSlot,
    time,
    setTime,
    freeTime,
    setFreeTime,
    check,
    setCheck,
  } = picker;

  return (
    <>
      {/* 1 · Experiencia */}
      <div className='space-y-1.5'>
        <label className='text-[13px] font-medium text-[#455a54]'>
          {experienceLabel}
        </label>
        <select
          value={expId}
          onChange={(e) => setExpId(e.target.value)}
          className={cn('h-10 w-full rounded-md border px-3 text-sm sm:h-9', field)}
        >
          <option value=''>Elegí una experiencia…</option>
          {experiences
            .filter((e) => e.bookableOnline !== false)
            .map((e) => (
              <option key={e._id} value={e._id}>
                {e.name} · {e.durationMinutes} min
              </option>
            ))}
        </select>
      </div>

      {/* 2 · Día */}
      {expId && (
        <div className='space-y-1.5'>
          <label className='text-[13px] font-medium text-[#455a54]'>
            Día
          </label>
          {slotsLoading ? (
            <p className='text-sm text-[#7a6e6f]'>Buscando fechas…</p>
          ) : days.length === 0 ? (
            <p className='text-sm text-[#7a6e6f]'>
              Sin fechas con lugar en las próximas semanas.
            </p>
          ) : (
            <div className='flex gap-1.5 overflow-x-auto pb-1'>
              {days.map((d) => (
                <button
                  key={d.dateKey}
                  type='button'
                  onClick={() => setDay(d.dateKey)}
                  className={cn(
                    chip(d.dateKey === day),
                    'shrink-0 font-mono text-[12px]',
                  )}
                >
                  {fmtDayChip(d.dateKey)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3 · Horario: sugeridos + hora libre */}
      {expId && day && (
        <div className='space-y-1.5'>
          <label className='text-[13px] font-medium text-[#455a54]'>
            Horario
          </label>
          <div className='flex flex-wrap items-center gap-1.5'>
            {daySlots.map((sl) => (
              <button
                key={sl.startTime}
                type='button'
                onClick={() => {
                  setTime(sl.startTime);
                  setFreeTime('');
                  setCheck({ status: 'idle' });
                }}
                className={chip(time === sl.startTime && !freeTime)}
                title={`${sl.shiftName ?? 'Horario sugerido'} · hasta ${sl.maxPartySize} personas`}
              >
                {sl.startTime}
                <span className='ml-1.5 text-xs font-normal opacity-70'>
                  {sl.shiftName ?? 'sugerido'}
                </span>
              </button>
            ))}
            {/* Con horario propio (o fecha única) sólo se ofrecen sus horas. */}
            {!picker.exp?.ownSchedule?.length && (
              <>
                <span className='mx-1 text-[12px] text-[#a99f92]'>
                  u otra hora:
                </span>
                <Input
                  type='time'
                  value={freeTime}
                  min={picker.hours.open}
                  max={latestStart}
                  step={300}
                  onChange={(e) => setFreeTime(e.target.value)}
                  className={cn('h-9 w-28', field)}
                />
              </>
            )}
          </div>
          {selectedSlot && !freeTime && (
            <p className='text-[12px] font-medium text-[#455a54]'>
              {selectedSlot.startTime}–
              {fromMin(toMin(selectedSlot.startTime) + duration)} · con las mesas
              libres entran {selectedSlot.maxPartySize}
            </p>
          )}
          {check.status === 'checking' && (
            <p className='text-[12px] text-[#7a6e6f]'>Verificando mesas…</p>
          )}
          {check.status === 'ok' && freeTime && (
            <p className='text-[12px] font-medium text-[#455a54]'>
              ¡Hay lugar! {freeTime}–{fromMin(toMin(freeTime) + duration)} · con
              las mesas libres entran {check.maxPartySize}
            </p>
          )}
          {check.status === 'no' && (
            <p className='text-[12px] font-medium text-[#a33]'>
              {check.message}
            </p>
          )}
        </div>
      )}
    </>
  );
}
