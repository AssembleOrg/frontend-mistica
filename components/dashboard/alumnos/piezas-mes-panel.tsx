'use client';

// Planilla "Piezas del mes": un alumno por fila, como la hoja de cálculo que
// usaba el taller (coladas del mes), pero guardando en la ficha de cada uno.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { tallerAdmin, type MonthlyPieceRow } from '@/services/taller.admin.service';
import {
  MonthlyPieceFields,
  currentMonth,
  fieldCls,
  monthLabel,
  shiftMonth,
  slotLabel,
} from './monthly-piece';

export function PiezasMesPanel() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const [month, setMonth] = useState(currentMonth);
  const [rows, setRows] = useState<MonthlyPieceRow[] | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    try {
      setRows(await tallerAdmin.monthlyPieces(month));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cargar');
      setRows([]);
    }
  }, [month]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter((r) => !q || r.student.name.toLowerCase().includes(q));
  }, [rows, search]);

  const stats = useMemo(() => {
    const list = rows ?? [];
    const con = list.filter((r) => r.piece?.pieceName);
    return {
      total: list.length,
      pedidas: con.length,
      entregadas: con.filter((r) => r.piece?.delivered).length,
      adicionales: con.filter((r) => r.piece?.extraCharge).length,
      sinCobrar: con.filter((r) => r.piece?.extraCharge && !r.piece?.paid).length,
    };
  }, [rows]);

  const cols = isAdmin
    ? 'grid-cols-[1fr_9rem_11rem_5rem_5.5rem_9rem_5rem]'
    : 'grid-cols-[1fr_9rem_11rem_5rem_5.5rem]';

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex items-center gap-2.5'>
          <button type='button' onClick={() => setMonth((m) => shiftMonth(m, -1))} className='inline-flex size-8 items-center justify-center rounded-lg border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]' aria-label='Mes anterior'>
            <ChevronLeft className='h-4 w-4' />
          </button>
          <button type='button' onClick={() => setMonth((m) => shiftMonth(m, 1))} className='inline-flex size-8 items-center justify-center rounded-lg border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]' aria-label='Mes siguiente'>
            <ChevronRight className='h-4 w-4' />
          </button>
          <h2 className='font-tan-nimbus text-xl font-semibold text-[#455a54] sm:text-[22px]'>{monthLabel(month)}</h2>
          {month !== currentMonth() && (
            <button type='button' onClick={() => setMonth(currentMonth())} className='rounded-lg border border-[#e6dbcd] bg-white px-3 py-1.5 text-[13px] font-medium text-[#3d3338] hover:bg-[#fbf5ef]'>
              Este mes
            </button>
          )}
        </div>
        <div className='relative w-full sm:w-64'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99]' />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Buscar alumno' className={cn(fieldCls, 'rounded-full bg-white pl-9')} />
        </div>
      </div>

      <div className='flex flex-wrap gap-2 text-[13px] text-[#455a54]'>
        <Stat n={stats.pedidas} de={stats.total} label='con pieza' />
        <Stat n={stats.entregadas} label='entregadas' />
        {isAdmin && <Stat n={stats.adicionales} label='con adicional' />}
        {isAdmin && stats.sinCobrar > 0 && <Stat n={stats.sinCobrar} label='adicionales sin cobrar' tone='rojo' />}
      </div>

      <p className='text-xs text-[#7a6e6f]'>
        Una pieza por alumno y mes. Bizcocho apagado = fresca. Cada cambio se guarda solo; la pieza al salir del campo.
      </p>

      <div className='overflow-x-auto rounded-2xl border border-[#e6dbcd] bg-white'>
        <div className={cn('min-w-[52rem]', isAdmin && 'min-w-[66rem]')}>
          <div className={cn('grid items-center gap-3 border-b border-[#e6dbcd] bg-[#fbf5ef] px-4 py-2.5 font-mono text-[11px] tracking-wider text-[#7a6e6f]', cols)}>
            <span>ALUMNO</span>
            <span>DÍA QUE CURSA</span>
            <span>PIEZA</span>
            <span className='text-center'>BIZCOCHO</span>
            <span className='text-center'>ENTREGADA</span>
            {isAdmin && <span className='text-center'>ADICIONAL</span>}
            {isAdmin && <span className='text-center'>COBRADO</span>}
          </div>
          {rows === null ? (
            <div className='flex justify-center py-10'>
              <Loader2 className='h-6 w-6 animate-spin text-[#9d684e]' />
            </div>
          ) : visibles.length === 0 ? (
            <p className='p-6 text-sm text-[#7a6e6f]'>{search ? 'Sin resultados.' : 'No hay alumnos activos.'}</p>
          ) : (
            visibles.map((r) => (
              <div key={r.student._id} className={cn('grid items-center gap-3 border-b border-[#e6dbcd] px-4 py-2.5 last:border-0', cols)}>
                <span className='truncate text-sm font-medium text-[#3d3338]'>{r.student.name}</span>
                <span className='truncate text-xs text-[#7a6e6f]' title={r.groups.map((g) => g.name).join(', ')}>
                  {r.groups.map((g) => slotLabel(g.schedule)).filter(Boolean).join(' · ') || '—'}
                </span>
                <MonthlyPieceFields
                  studentId={r.student._id}
                  month={month}
                  value={r.piece}
                  isAdmin={isAdmin}
                  compact
                  onSaved={(p) =>
                    setRows((prev) =>
                      (prev ?? []).map((x) => (x.student._id === r.student._id ? { ...x, piece: p } : x)),
                    )
                  }
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ n, de, label, tone }: { n: number; de?: number; label: string; tone?: 'rojo' }) {
  return (
    <span className={cn('rounded-full border px-3 py-1', tone === 'rojo' ? 'border-[#efb9b9] bg-[#fbe4e4] text-[#a33]' : 'border-[#e6dbcd] bg-white')}>
      <b>{n}</b>
      {de != null && <span className='text-[#7a6e6f]'>/{de}</span>} {label}
    </span>
  );
}
