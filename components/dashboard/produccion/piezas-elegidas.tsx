'use client';

// Qué piezas está eligiendo la gente, por semana o por mes: sale de las fichas
// que se cargan en Piezas. Sólo informativo, para que producción sepa qué se
// consume más y qué reponer sin ir a contar a la estantería.

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { AR_TZ } from '@/lib/reservas-format';
import { piecesAdmin, type PieceTally } from '@/services/pieces.admin.service';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function todayAR(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: AR_TZ });
}

// Corre `ymd` una semana o un mes (al día 1 en los meses, para no saltar).
function shift(ymd: string, period: 'week' | 'month', n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (period === 'week') d.setUTCDate(d.getUTCDate() + 7 * n);
  else d.setUTCMonth(d.getUTCMonth() + n, 1);
  return d.toISOString().slice(0, 10);
}

function label(t: PieceTally): string {
  const [y, m, d] = t.from.split('-').map(Number);
  if (t.period === 'month') return `${MESES[m - 1]} ${y}`;
  const [, m2, d2] = t.to.split('-').map(Number);
  return `semana del ${d}/${m} al ${d2}/${m2}`;
}

export function PiezasElegidas() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [date, setDate] = useState(todayAR());
  const [tally, setTally] = useState<PieceTally | null>(null);

  useEffect(() => {
    let alive = true;
    piecesAdmin
      .productionTally(period, date)
      .then((t) => alive && setTally(t))
      .catch((e) => {
        if (alive) showToast.error(e instanceof Error ? e.message : 'Error al cargar');
      });
    return () => {
      alive = false;
    };
  }, [period, date]);

  const max = Math.max(1, ...(tally?.items.map((i) => i.count) ?? []));

  return (
    <div className='rounded-2xl border border-[#e6dbcd] bg-white p-4'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='inline-flex rounded-lg border border-[#e6dbcd] bg-[#fbf5ef] p-0.5'>
          {(
            [
              ['week', 'Semana'],
              ['month', 'Mes'],
            ] as const
          ).map(([key, text]) => (
            <button
              key={key}
              type='button'
              onClick={() => setPeriod(key)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                period === key ? 'bg-[#455a54] text-white' : 'text-[#7a6e6f] hover:text-[#455a54]',
              )}
            >
              {text}
            </button>
          ))}
        </div>
        <button
          type='button'
          onClick={() => setDate(shift(date, period, -1))}
          className='rounded-md p-1 text-[#455a54] hover:bg-[#fbf5ef]'
          aria-label='Anterior'
        >
          <ChevronLeft className='size-4' />
        </button>
        <p className='text-sm font-semibold capitalize text-[#455a54]'>
          {tally ? label(tally) : '…'}
        </p>
        <button
          type='button'
          onClick={() => setDate(shift(date, period, 1))}
          className='rounded-md p-1 text-[#455a54] hover:bg-[#fbf5ef]'
          aria-label='Siguiente'
        >
          <ChevronRight className='size-4' />
        </button>
        {tally && (
          <span className='ml-auto text-xs text-[#7a6e6f]'>
            {tally.total} {tally.total === 1 ? 'pieza elegida' : 'piezas elegidas'}
          </span>
        )}
      </div>

      <div className='mt-3 flex flex-col gap-1.5'>
        {tally && tally.items.length === 0 && (
          <p className='py-2 text-sm text-[#7a6e6f]'>Sin piezas cargadas en este período.</p>
        )}
        {tally?.items.map((i) => (
          <div key={i.name} className='flex items-center gap-3'>
            <span className='w-40 shrink-0 truncate text-sm text-[#3d3338] sm:w-56'>{i.name}</span>
            <div className='h-2.5 min-w-0 flex-1 rounded-full bg-[#f6efe6]'>
              <div
                className='h-2.5 rounded-full bg-[#9d684e]'
                style={{ width: `${(i.count / max) * 100}%` }}
              />
            </div>
            <span className='w-8 shrink-0 text-right text-sm font-semibold text-[#455a54]'>
              {i.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
