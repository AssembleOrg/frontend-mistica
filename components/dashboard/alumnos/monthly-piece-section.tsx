'use client';

// "Pieza del mes" dentro de la ficha del alumno: el mes actual editable y el
// historial de los meses anteriores.

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tallerAdmin, type MonthlyPiece } from '@/services/taller.admin.service';
import { MonthlyPieceFields, currentMonth, monthLabel, shiftMonth } from './monthly-piece';

export function MonthlyPieceSection({ studentId, isAdmin }: { studentId: string; isAdmin: boolean }) {
  const [month, setMonth] = useState(currentMonth);
  const [history, setHistory] = useState<MonthlyPiece[]>([]);

  const load = useCallback(async () => {
    try {
      setHistory(await tallerAdmin.monthlyPiecesOf(studentId));
    } catch {
      setHistory([]);
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = history.find((h) => h.month === month) ?? null;
  const previous = history.filter((h) => h.month !== month).slice(0, 6);

  return (
    <div className='flex flex-col gap-3 rounded-lg border border-[#e6dbcd] p-3'>
      <div className='flex items-center gap-2'>
        <button type='button' onClick={() => setMonth((m) => shiftMonth(m, -1))} className='inline-flex size-7 items-center justify-center rounded-md border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]' aria-label='Mes anterior'>
          <ChevronLeft className='h-3.5 w-3.5' />
        </button>
        <button type='button' onClick={() => setMonth((m) => shiftMonth(m, 1))} className='inline-flex size-7 items-center justify-center rounded-md border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]' aria-label='Mes siguiente'>
          <ChevronRight className='h-3.5 w-3.5' />
        </button>
        <span className='text-[13px] font-semibold text-[#3d3338]'>{monthLabel(month)}</span>
      </div>
      <MonthlyPieceFields
        key={month}
        studentId={studentId}
        month={month}
        value={current}
        isAdmin={isAdmin}
        onSaved={(p) =>
          setHistory((prev) => {
            const rest = prev.filter((h) => h.month !== p.month);
            return [p, ...rest].sort((a, b) => b.month.localeCompare(a.month));
          })
        }
      />
      {previous.length > 0 && (
        <div className='flex flex-col gap-1 border-t border-[#e6dbcd] pt-2'>
          <span className='text-[11px] font-mono tracking-wider text-[#7a6e6f]'>ANTERIORES</span>
          {previous.map((h) => (
            <button
              key={h._id}
              type='button'
              onClick={() => setMonth(h.month)}
              className='flex flex-wrap items-center gap-2 rounded-md px-1 py-1 text-left text-[12px] text-[#455a54] hover:bg-[#fbf5ef]'
            >
              <span className='w-28 shrink-0 text-[#7a6e6f]'>{monthLabel(h.month)}</span>
              <span className='font-medium'>{h.pieceName || '—'}</span>
              <span className='text-[#7a6e6f]'>{h.bisque ? 'bizcocho' : 'fresca'}</span>
              <span className={cn('rounded-full px-2 py-0.5', h.delivered ? 'bg-[#E7F0EC]' : 'bg-[#f1ede6] text-[#7a6e6f]')}>
                {h.delivered ? 'entregada' : 'pendiente'}
              </span>
              {isAdmin && h.extraCharge && (
                <span className={cn('rounded-full px-2 py-0.5', h.paid ? 'bg-[#E7F0EC]' : 'bg-[#fbe4e4] text-[#a33]')}>
                  adicional {h.extraAmount ? `$${h.extraAmount}` : ''}{' '}
                  {h.paid
                    ? `cobrado${h.paidAt ? ` el ${new Date(h.paidAt).toLocaleDateString('es-AR')}` : ''}`
                    : 'sin cobrar'}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
