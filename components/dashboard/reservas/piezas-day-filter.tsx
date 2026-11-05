'use client';

import { useEffect, useRef, useState } from 'react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { PopoverPortal } from '@/components/ui/popover-portal';
import { cn } from '@/lib/utils';
import { piecesAdmin, type PieceDay } from '@/services/pieces.admin.service';

const toKey = (d: Date) => format(d, 'yyyy-MM-dd');
const fromKey = (key: string) => parse(key, 'yyyy-MM-dd', new Date());

const shiftDay = (key: string, delta: number) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + delta);
  return toKey(d);
};

const dot =
  'relative after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:rounded-full';

/**
 * Elegir el día de trabajo de las piezas, como el calendario de Reservas. Cada
 * día con piezas lleva un punto: terracota si falta algo, verde si está todo.
 */
export function PiezasDayFilter({
  value,
  onChange,
  filters,
  refreshKey,
}: {
  value: string;
  onChange: (day: string) => void;
  filters: { status?: string; search?: string; professorId?: string };
  /** Cambia cuando se tocó una pieza: los puntos se recalculan. */
  refreshKey: number;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(() => (value ? fromKey(value) : new Date()));
  const [days, setDays] = useState<PieceDay[]>([]);
  const monthKey = format(month, 'yyyy-MM');
  const { status, search, professorId } = filters;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    piecesAdmin
      .days({ month: monthKey, status, search, professorId })
      .then((rows) => {
        if (alive) setDays(rows);
      })
      .catch(() => {
        if (alive) setDays([]);
      });
    return () => {
      alive = false;
    };
  }, [open, monthKey, status, search, professorId, refreshKey]);

  const pending = days.filter((d) => d.pending > 0).map((d) => fromKey(d.date));
  const complete = days.filter((d) => d.pending === 0).map((d) => fromKey(d.date));
  const arrowCls =
    'inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef] sm:size-9';

  return (
    <div className='flex items-center gap-1.5'>
      {value && (
        <button
          type='button'
          onClick={() => onChange(shiftDay(value, -1))}
          aria-label='Día anterior'
          className={arrowCls}
        >
          <ChevronLeft className='h-4 w-4' />
        </button>
      )}
      <div ref={anchorRef} className='min-w-0'>
        <button
          type='button'
          onClick={() => {
            setMonth(value ? fromKey(value) : new Date());
            setOpen((o) => !o);
          }}
          className={cn(
            'inline-flex h-10 max-w-full items-center gap-2 rounded-xl border px-3 text-sm font-medium sm:h-9',
            value
              ? 'border-[#455a54] bg-[#E7F0EC] text-[#455a54]'
              : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
          )}
        >
          <CalendarDays className='h-4 w-4 shrink-0 text-[#9d684e]' />
          <span className='truncate first-letter:uppercase'>
            {value
              ? format(fromKey(value), "EEEE d 'de' MMMM", { locale: es })
              : 'Todas las fechas'}
          </span>
        </button>
      </div>
      {value && (
        <>
          <button
            type='button'
            onClick={() => onChange(shiftDay(value, 1))}
            aria-label='Día siguiente'
            className={arrowCls}
          >
            <ChevronRight className='h-4 w-4' />
          </button>
          <button
            type='button'
            onClick={() => onChange('')}
            aria-label='Ver todas las fechas'
            title='Ver todas las fechas'
            className={arrowCls}
          >
            <X className='h-4 w-4' />
          </button>
        </>
      )}
      <PopoverPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        className='w-auto rounded-xl border border-[#e6dbcd] bg-white shadow-lg'
      >
        <Calendar
          mode='single'
          locale={es}
          month={month}
          onMonthChange={setMonth}
          selected={value ? fromKey(value) : undefined}
          onSelect={(d) => {
            if (d) onChange(toKey(d));
            setOpen(false);
          }}
          modifiers={{ pendingPieces: pending, completePieces: complete }}
          modifiersClassNames={{
            pendingPieces: `${dot} after:bg-[#9d684e]`,
            completePieces: `${dot} after:bg-[#3f7d5c]`,
          }}
          className='p-2 [--cell-size:2.5rem]'
        />
        <div className='flex flex-wrap gap-x-4 gap-y-1 border-t border-[#efe7dc] px-3 py-2 text-[11px] text-[#7a6e6f]'>
          <span className='inline-flex items-center gap-1.5'>
            <span className='size-1.5 rounded-full bg-[#9d684e]' /> Falta terminar
          </span>
          <span className='inline-flex items-center gap-1.5'>
            <span className='size-1.5 rounded-full bg-[#3f7d5c]' /> Todo listo
          </span>
        </div>
      </PopoverPortal>
    </div>
  );
}
