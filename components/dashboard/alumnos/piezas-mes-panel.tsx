'use client';

// Planilla "Piezas del mes": un alumno por fila, como la hoja de cálculo que
// usaba el taller (coladas del mes), pero guardando en la ficha de cada uno.
// Un alumno puede pedir más de una pieza: cada una va en su propia fila.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Plus, Search } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import {
  tallerAdmin,
  type MonthlyPiece,
  type MonthlyPieceSheetRow,
} from '@/services/taller.admin.service';
import {
  MonthlyPieceFields,
  currentMonth,
  fieldCls,
  monthLabel,
  shiftMonth,
  slotLabel,
} from './monthly-piece';
import { canManageRole } from '@/lib/views';
import { ResponsableField, useResponsable } from '@/components/dashboard/responsable-field';

export function PiezasMesPanel() {
  const user = useAuthStore((s) => s.user);
  // Admin o encargado/a: la gestión operativa.
  const canManage = canManageRole(user?.role);
  const responsable = useResponsable();
  const [month, setMonth] = useState(currentMonth);
  const [rows, setRows] = useState<MonthlyPieceSheetRow[] | null>(null);
  // Piezas de más todavía sin guardar, por alumno.
  const [drafts, setDrafts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    setDrafts({});
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
    const pieces = list.flatMap((r) => r.pieces.filter((p) => p.pieceName));
    return {
      total: list.length,
      pedidas: list.filter((r) => r.pieces.some((p) => p.pieceName)).length,
      entregadas: pieces.filter((p) => p.delivered).length,
      adicionales: pieces.filter((p) => p.extraCharge).length,
      sinCobrar: pieces.filter((p) => p.extraCharge && !p.paid).length,
    };
  }, [rows]);

  /** Deja en la fila del alumno la pieza recién guardada (nueva o editada). */
  function upsertPiece(studentId: string, p: MonthlyPiece) {
    setRows((prev) =>
      (prev ?? []).map((x) =>
        x.student._id !== studentId
          ? x
          : {
              ...x,
              pieces: x.pieces.some((q) => q._id === p._id)
                ? x.pieces.map((q) => (q._id === p._id ? p : q))
                : [...x.pieces, p],
            },
      ),
    );
  }

  function dropPiece(studentId: string, pieceId: string) {
    setRows((prev) =>
      (prev ?? []).map((x) =>
        x.student._id !== studentId
          ? x
          : { ...x, pieces: x.pieces.filter((q) => q._id !== pieceId) },
      ),
    );
  }

  function setDraft(studentId: string, delta: number) {
    setDrafts((d) => ({ ...d, [studentId]: Math.max(0, (d[studentId] ?? 0) + delta) }));
  }

  const cols = canManage
    ? 'grid-cols-[1fr_9rem_11rem_8rem_5rem_5rem_4.5rem_5.5rem_11rem_5rem_2rem]'
    : 'grid-cols-[1fr_9rem_11rem_8rem_5rem_5rem_4.5rem_5.5rem_2rem]';

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
        {canManage && <Stat n={stats.adicionales} label='con adicional' />}
        {canManage && stats.sinCobrar > 0 && <Stat n={stats.sinCobrar} label='adicionales sin cobrar' tone='rojo' />}
      </div>

      <ResponsableField
        value={responsable.value}
        onChange={responsable.onChange}
        label='¿Quién carga las piezas?'
      />

      <p className='text-xs text-[#7a6e6f]'>
        La pieza se elige del catálogo (escribí 2 o 3 letras): su categoría dice si lleva adicional, que se puede bonificar. Si pide más de una, sumala con &quot;Otra pieza&quot;. Fresca o bizcocho: con una prendida, la otra se bloquea. &quot;Para&quot; es la clase en que la quiere. Cada cambio se guarda solo.
      </p>

      <div className='overflow-x-auto rounded-2xl border border-[#e6dbcd] bg-white'>
        <div className={cn('min-w-[72rem]', canManage && 'min-w-[88rem]')}>
          <div className={cn('grid items-center gap-3 border-b border-[#e6dbcd] bg-[#fbf5ef] px-4 py-2.5 font-mono text-[11px] tracking-wider text-[#7a6e6f]', cols)}>
            <span>ALUMNO</span>
            <span>DÍA QUE CURSA</span>
            <span>PIEZA</span>
            <span>PARA</span>
            <span className='text-center'>FRESCA</span>
            <span className='text-center'>BIZCOCHO</span>
            <span className='text-center'>LISTA</span>
            <span className='text-center'>ENTREGADA</span>
            {canManage && <span className='text-center'>ADICIONAL</span>}
            {canManage && <span className='text-center'>COBRADO</span>}
            <span className='sr-only'>Borrar</span>
          </div>
          {rows === null ? (
            <div className='flex justify-center py-10'>
              <Loader2 className='h-6 w-6 animate-spin text-[#9d684e]' />
            </div>
          ) : visibles.length === 0 ? (
            <p className='p-6 text-sm text-[#7a6e6f]'>{search ? 'Sin resultados.' : 'No hay alumnos activos.'}</p>
          ) : (
            visibles.map((r) => {
              const sid = r.student._id;
              const slots = r.groups.flatMap((g) => g.schedule);
              // Sin piezas todavía: una fila vacía que crea la pieza del mes.
              const pieces: (MonthlyPiece | null)[] = r.pieces.length ? r.pieces : [null];
              const draftCount = drafts[sid] ?? 0;
              const canAddMore = r.pieces.some((p) => p.pieceName);
              return (
                <div key={sid} className='border-b border-[#e6dbcd] last:border-0'>
                  {pieces.map((p, i) => (
                    <div key={p?._id ?? `first-${sid}`} className={cn('grid items-center gap-3 px-4 py-2.5', cols)}>
                      {i === 0 ? (
                        <span className='flex min-w-0 flex-col items-start gap-1'>
                          <span className='truncate text-sm font-medium text-[#3d3338]'>{r.student.name}</span>
                          {canAddMore && (
                            <button
                              type='button'
                              onClick={() => setDraft(sid, 1)}
                              className='inline-flex items-center gap-1 text-[11px] font-medium text-[#9d684e] hover:underline'
                            >
                              <Plus className='h-3 w-3' /> Otra pieza
                            </button>
                          )}
                        </span>
                      ) : (
                        <span className='pl-3 text-xs text-[#7a6e6f]'>Otra pieza</span>
                      )}
                      {i === 0 ? (
                        <span className='truncate text-xs text-[#7a6e6f]' title={r.groups.map((g) => g.name).join(', ')}>
                          {r.groups.map((g) => slotLabel(g.schedule)).filter(Boolean).join(' · ') || '—'}
                        </span>
                      ) : (
                        <span />
                      )}
                      <MonthlyPieceFields
                        studentId={sid}
                        month={month}
                        value={p}
                        canManage={canManage}
                        slots={slots}
                        compact
                        doneBy={responsable.value || undefined}
                        onSaved={(saved) => upsertPiece(sid, saved)}
                        onRemove={p ? () => dropPiece(sid, p._id) : undefined}
                      />
                    </div>
                  ))}
                  {Array.from({ length: draftCount }, (_, i) => (
                    <div key={`draft-${sid}-${i}`} className={cn('grid items-center gap-3 px-4 py-2.5', cols)}>
                      <span className='pl-3 text-xs text-[#9d684e]'>Otra pieza (nueva)</span>
                      <span />
                      <MonthlyPieceFields
                        studentId={sid}
                        month={month}
                        value={null}
                        additional
                        canManage={canManage}
                        slots={slots}
                        compact
                        doneBy={responsable.value || undefined}
                        onSaved={(saved) => {
                          setDraft(sid, -1);
                          upsertPiece(sid, saved);
                        }}
                        onRemove={() => setDraft(sid, -1)}
                      />
                    </div>
                  ))}
                </div>
              );
            })
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
