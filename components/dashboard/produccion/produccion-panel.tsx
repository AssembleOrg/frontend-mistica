'use client';

// Lista de Producción: las piezas del mes que pidieron los alumnos, en el
// orden en que se pidieron (las que faltan hacer primero), con fresca/bizcocho
// y para qué clase la quieren. Producción marca cada una "Lista" al terminarla.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RotateCw, Search } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { tallerAdmin, type MonthlyPieceRow } from '@/services/taller.admin.service';
import { dueLabel, fieldCls, slotLabel } from '@/components/dashboard/alumnos/monthly-piece';

const fmtDay = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      })
    : '—';

const COLS = 'grid-cols-[6rem_1fr_1fr_6.5rem_7rem_9rem_5rem_6rem]';

export function ProduccionPanel() {
  const [rows, setRows] = useState<MonthlyPieceRow[] | null>(null);
  const [all, setAll] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setRows(null);
    try {
      setRows(await tallerAdmin.productionList(all));
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo cargar la lista');
      setRows([]);
    }
  }, [all]);

  useEffect(() => {
    void load();
  }, [load]);

  // Marcar lista: se ve al instante; si falla, vuelve como estaba.
  async function setReady(pieceId: string, ready: boolean) {
    const patch = (value: boolean) =>
      setRows((prev) =>
        (prev ?? []).map((r) =>
          r.piece?._id === pieceId ? { ...r, piece: { ...r.piece, ready: value } } : r,
        ),
      );
    patch(ready);
    try {
      await tallerAdmin.setPieceReady(pieceId, ready);
    } catch (e) {
      patch(!ready);
      showToast.error(e instanceof Error ? e.message : 'No se pudo guardar');
    }
  }

  const visibles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        !q ||
        r.student.name.toLowerCase().includes(q) ||
        (r.piece?.pieceName ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='relative w-full sm:w-72'>
          <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a99]' />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Buscar alumno o pieza'
            className={cn(fieldCls, 'rounded-full bg-white pl-9')}
          />
        </div>
        <div className='flex items-center gap-3'>
          <label className='flex items-center gap-2 text-[13px] text-[#455a54]'>
            <Switch checked={all} onCheckedChange={setAll} aria-label='Incluir entregadas' />
            Incluir entregadas
          </label>
          <button
            type='button'
            onClick={() => void load()}
            className='inline-flex size-8 items-center justify-center rounded-lg border border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]'
            aria-label='Actualizar'
            title='Actualizar'
          >
            <RotateCw className='h-4 w-4' />
          </button>
        </div>
      </div>

      <div className='overflow-x-auto rounded-2xl border border-[#e6dbcd] bg-white'>
        <div className='min-w-[57rem]'>
          <div className={cn('grid items-center gap-3 border-b border-[#e6dbcd] bg-[#fbf5ef] px-4 py-2.5 font-mono text-[11px] tracking-wider text-[#7a6e6f]', COLS)}>
            <span>PEDIDA</span>
            <span>ALUMNO</span>
            <span>PIEZA</span>
            <span>TIPO</span>
            <span>PARA</span>
            <span>CURSA</span>
            <span className='text-center'>LISTA</span>
            <span className='text-center'>ESTADO</span>
          </div>
          {rows === null ? (
            <div className='flex justify-center py-10'>
              <Loader2 className='h-6 w-6 animate-spin text-[#9d684e]' />
            </div>
          ) : visibles.length === 0 ? (
            <p className='p-6 text-sm text-[#7a6e6f]'>
              {search ? 'Sin resultados.' : 'No hay piezas pendientes.'}
            </p>
          ) : (
            visibles.map((r) => {
              const p = r.piece!;
              const tipo = p.bisque ? 'Bizcocho' : p.fresh ? 'Fresca' : null;
              return (
                <div key={p._id} className={cn('grid items-center gap-3 border-b border-[#e6dbcd] px-4 py-2.5 last:border-0', COLS)}>
                  <span className='font-mono text-xs text-[#7a6e6f]'>{fmtDay(p.requestedAt)}</span>
                  <span className='truncate text-sm font-medium text-[#3d3338]'>{r.student.name}</span>
                  <span className='truncate text-sm text-[#3d3338]'>{p.pieceName}</span>
                  <span>
                    {tipo ? (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          p.bisque ? 'bg-[#f3e2d0] text-[#8a5638]' : 'bg-[#E7F0EC] text-[#455a54]',
                        )}
                      >
                        {tipo}
                      </span>
                    ) : (
                      <span className='text-xs text-[#a33]'>Sin elegir</span>
                    )}
                  </span>
                  <span className='text-sm text-[#3d3338]'>{p.dueDate ? dueLabel(p.dueDate) : '—'}</span>
                  <span className='truncate text-xs text-[#7a6e6f]'>
                    {r.groups.map((g) => slotLabel(g.schedule)).filter(Boolean).join(' · ') || '—'}
                  </span>
                  <span className='flex justify-center'>
                    <Switch
                      checked={p.ready}
                      onCheckedChange={(v) => void setReady(p._id, v)}
                      disabled={p.delivered}
                      aria-label={`Marcar lista: ${p.pieceName}`}
                    />
                  </span>
                  <span className='text-center text-xs font-medium'>
                    {p.delivered ? (
                      <span className='text-[#455a54]'>Entregada</span>
                    ) : p.ready ? (
                      <span className='text-[#455a54]'>Lista</span>
                    ) : (
                      <span className='text-[#9d684e]'>Por hacer</span>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
