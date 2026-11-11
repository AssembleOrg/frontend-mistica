'use client';

// PEDIDOS: las piezas del mes que pidieron los alumnos, agrupadas por el día
// en que las necesitan. "LA HICE" la marca lista; "Deshacer" la vuelve atrás.

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { errorText } from '@/lib/api-error-messages';
import { tallerAdmin, type MonthlyPiece, type MonthlyPieceRow } from '@/services/taller.admin.service';
import { BackButton } from './back-button';
import { ErrorBox } from './error-box';
import { addDays, shortDay, todayAR } from './dates';

type Row = MonthlyPieceRow & { piece: MonthlyPiece };

interface Group {
  key: string;
  label: string;
  color: string;
  rows: Row[];
}

const visible = (rows: MonthlyPieceRow[]): Row[] =>
  rows.filter((r): r is Row => !!r.piece && !r.piece.delivered && !!r.piece.pieceName);

/** Lo que falta hacer para hoy, mañana o ya atrasado (el número del botón). */
export function pendingCount(rows: MonthlyPieceRow[]): number {
  const limit = addDays(todayAR(), 1);
  return visible(rows).filter((r) => !r.piece.ready && (r.piece.dueDate ?? '') <= limit && !!r.piece.dueDate)
    .length;
}

function groupRows(rows: Row[]): Group[] {
  const today = todayAR();
  const tomorrow = addDays(today, 1);
  const map = new Map<string, Group>();
  const add = (key: string, label: string, color: string, row: Row) => {
    if (!map.has(key)) map.set(key, { key, label, color, rows: [] });
    map.get(key)!.rows.push(row);
  };
  for (const r of rows) {
    const due = r.piece.dueDate;
    if (!due) add('9999', 'SIN FECHA', 'bg-[#a99f92]', r);
    else if (due < today) add('0000', 'ATRASADO', 'bg-[#c0392b]', r);
    else if (due === today) add(due, 'HOY', 'bg-[#e07b2e]', r);
    else if (due === tomorrow) add(due, 'MAÑANA', 'bg-[#e3b23c]', r);
    else add(due, shortDay(due), 'bg-[#7a6e6f]', r);
  }
  // Sin reordenar dentro del grupo: la card no salta de lugar al marcarla.
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function Pedidos({
  rows,
  failed,
  setRows,
  onBack,
}: {
  rows: MonthlyPieceRow[] | null;
  /** No se pudo cargar la lista. */
  failed: boolean;
  setRows: React.Dispatch<React.SetStateAction<MonthlyPieceRow[] | null>>;
  onBack: () => void;
}) {
  // Piezas guardándose: el botón queda trabado para que un doble toque no
  // mande dos cambios encontrados.
  const [busy, setBusy] = useState<Set<string>>(new Set());

  // Se ve al instante; si falla, vuelve como estaba.
  async function toggle(piece: MonthlyPiece) {
    if (busy.has(piece._id)) return;
    const ready = !piece.ready;
    setBusy((prev) => new Set(prev).add(piece._id));
    // Un cambio nuevo cierra el aviso anterior: su "Deshacer" ya no aplica.
    toast.dismiss(piece._id);
    const patch = (value: boolean) =>
      setRows((prev) =>
        (prev ?? []).map((r) =>
          r.piece?._id === piece._id ? { ...r, piece: { ...r.piece, ready: value } } : r,
        ),
      );
    patch(ready);
    try {
      await tallerAdmin.setPieceReady(piece._id, ready);
      // Confirmación visible, con Deshacer a mano por si tocó sin querer.
      if (ready) {
        toast.success(`${piece.pieceName}: LISTA`, {
          id: piece._id,
          duration: 6000,
          action: { label: 'Deshacer', onClick: () => void toggle({ ...piece, ready: true }) },
        });
      } else {
        toast(`${piece.pieceName}: vuelve a pendiente`, { id: piece._id });
      }
    } catch (e) {
      patch(!ready);
      showToast.error(errorText(e, 'No se pudo guardar'));
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(piece._id);
        return next;
      });
    }
  }

  const groups = rows ? groupRows(visible(rows)) : [];

  return (
    <div>
      <BackButton onClick={onBack} title='PEDIDOS' />

      {failed && <ErrorBox />}
      {rows === null && <p className='py-10 text-center text-xl text-[#7a6e6f]'>Cargando…</p>}
      {rows !== null && !failed && groups.length === 0 && (
        <p className='rounded-3xl bg-white py-12 text-center text-xl font-bold text-[#455a54]'>
          No hay pedidos pendientes
        </p>
      )}

      <div className='flex flex-col gap-6'>
        {groups.map((g) => (
          <section key={g.key}>
            <h2 className={cn('mb-3 rounded-2xl px-5 py-3 text-2xl font-black tracking-wide text-white', g.color)}>
              {g.label}
            </h2>
            <div className='grid gap-3 sm:grid-cols-2'>
              {g.rows.map((r) => (
                <div
                  key={r.piece._id}
                  className={cn(
                    'flex items-center gap-3 rounded-3xl border-4 p-4 transition-colors duration-300',
                    r.piece.ready ? 'border-[#3f8a5f] bg-[#cfe6d7]' : 'border-transparent bg-white shadow-sm',
                  )}
                >
                  <div className='min-w-0 flex-1'>
                    {r.piece.ready && (
                      <p className='mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#3f8a5f] px-3 py-1 text-base font-black tracking-wide text-white'>
                        <CheckCircle2 className='size-5' strokeWidth={2.5} />
                        LISTA
                      </p>
                    )}
                    <p className='text-2xl font-black leading-tight text-[#3d3338]'>{r.piece.pieceName}</p>
                    <div className='mt-2 flex flex-wrap items-center gap-2'>
                      {r.piece.bisque && (
                        <span className='rounded-full bg-[#9d684e] px-3 py-1 text-sm font-bold text-white'>
                          BIZCOCHO
                        </span>
                      )}
                      {r.piece.fresh && (
                        <span className='rounded-full border-2 border-[#455a54] bg-white px-3 py-0.5 text-sm font-bold text-[#455a54]'>
                          FRESCA
                        </span>
                      )}
                      <span className='truncate text-sm text-[#7a6e6f]'>{r.student.name}</span>
                    </div>
                  </div>
                  {r.piece.ready ? (
                    <button
                      type='button'
                      onClick={() => void toggle(r.piece)}
                      disabled={busy.has(r.piece._id)}
                      className='h-12 shrink-0 rounded-xl border-2 border-[#5f9b78] bg-white px-4 text-base font-bold text-[#2f6b4a] active:scale-95 disabled:opacity-50'
                    >
                      Deshacer
                    </button>
                  ) : (
                    <button
                      type='button'
                      onClick={() => void toggle(r.piece)}
                      disabled={busy.has(r.piece._id)}
                      className='h-16 w-32 shrink-0 rounded-2xl bg-[#3f8a5f] text-lg font-black text-white shadow-md active:scale-95 disabled:opacity-50'
                    >
                      LA HICE
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
