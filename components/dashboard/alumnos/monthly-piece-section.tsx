'use client';

// "Pieza del mes" dentro de la ficha del alumno: las piezas del mes elegido
// (puede pedir más de una), editables, y el historial de los anteriores.

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tallerAdmin, type MonthlyPiece } from '@/services/taller.admin.service';
import { MonthlyPieceFields, currentMonth, monthLabel, shiftMonth } from './monthly-piece';
import { ResponsableField, useResponsable } from '@/components/dashboard/responsable-field';

export function MonthlyPieceSection({ studentId, canManage }: { studentId: string; canManage: boolean }) {
  const [month, setMonth] = useState(currentMonth);
  const [history, setHistory] = useState<MonthlyPiece[]>([]);
  // Piezas de más todavía sin guardar.
  const [drafts, setDrafts] = useState(0);
  const responsable = useResponsable();

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

  useEffect(() => {
    setDrafts(0);
  }, [month]);

  const current = history.filter((h) => h.month === month);
  const previous = history.filter((h) => h.month !== month).slice(0, 8);

  function upsert(p: MonthlyPiece) {
    setHistory((prev) => {
      const exists = prev.some((h) => h._id === p._id);
      const next = exists ? prev.map((h) => (h._id === p._id ? p : h)) : [...prev, p];
      // Mes más reciente primero; dentro del mes, en el orden en que se pidieron.
      return [...next].sort((a, b) => b.month.localeCompare(a.month));
    });
  }

  const shown: (MonthlyPiece | null)[] = current.length ? current : [null];

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
      <ResponsableField
        value={responsable.value}
        onChange={responsable.onChange}
        label='¿Quién la carga?'
      />
      {shown.map((p, i) => (
        <div key={p?._id ?? `first-${month}`} className={cn(i > 0 && 'border-t border-[#e6dbcd] pt-3')}>
          <MonthlyPieceFields
            studentId={studentId}
            month={month}
            value={p}
            canManage={canManage}
            doneBy={responsable.value || undefined}
            onSaved={upsert}
            onRemove={p ? () => setHistory((prev) => prev.filter((h) => h._id !== p._id)) : undefined}
          />
        </div>
      ))}
      {Array.from({ length: drafts }, (_, i) => (
        <div key={`draft-${month}-${i}`} className='border-t border-[#e6dbcd] pt-3'>
          <MonthlyPieceFields
            studentId={studentId}
            month={month}
            value={null}
            additional
            canManage={canManage}
            doneBy={responsable.value || undefined}
            onSaved={(p) => {
              setDrafts((n) => Math.max(0, n - 1));
              upsert(p);
            }}
            onRemove={() => setDrafts((n) => Math.max(0, n - 1))}
          />
        </div>
      ))}
      {current.some((p) => p.pieceName) && (
        <button
          type='button'
          onClick={() => setDrafts((n) => n + 1)}
          className='inline-flex items-center gap-1 self-start text-xs font-medium text-[#9d684e] hover:underline'
        >
          <Plus className='h-3.5 w-3.5' /> Otra pieza este mes (las de más llevan adicional)
        </button>
      )}
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
              {h.category && <span className='text-[#7a6e6f]'>{h.category}</span>}
              <span className='text-[#7a6e6f]'>{h.bisque ? 'bizcocho' : 'fresca'}</span>
              <span className={cn('rounded-full px-2 py-0.5', h.delivered ? 'bg-[#E7F0EC]' : 'bg-[#f1ede6] text-[#7a6e6f]')}>
                {h.delivered ? 'entregada' : 'pendiente'}
              </span>
              {canManage && h.waived && (
                <span className='rounded-full bg-[#E7F0EC] px-2 py-0.5'>bonificada</span>
              )}
              {canManage && h.extraCharge && (
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
