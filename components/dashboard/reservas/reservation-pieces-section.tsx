'use client';

// Sección "Piezas" dentro del detalle de una reserva: lista las piezas ya
// cargadas de esa reserva y permite cargar nuevas (una ficha por persona) sin
// salir del panel. Imita el flujo de los bloqueos: apretás la reserva y
// gestionás sus piezas ahí mismo.

import { useCallback, useEffect, useState } from 'react';
import { Flame, Plus } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  piecesAdmin,
  PIECE_STATUS_LABEL,
  type PieceItem,
} from '@/services/pieces.admin.service';
import type { ReservationItem } from '@/services/reservations.admin.service';

function statusLabel(key: string): string {
  return (PIECE_STATUS_LABEL as Record<string, string>)[key] ?? key;
}

export function ReservationPiecesSection({
  reservation,
}: {
  reservation: ReservationItem;
}) {
  const [pieces, setPieces] = useState<PieceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await piecesAdmin.list({
        reservationId: reservation._id,
        limit: 100,
      });
      setPieces(res.items);
    } catch {
      setPieces([]);
    } finally {
      setLoading(false);
    }
  }, [reservation._id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className='flex flex-col gap-2.5'>
      <div className='flex items-center justify-between'>
        <span className='font-mono text-[11px] font-medium tracking-wider text-[#7a6e6f]'>
          PIEZAS ({pieces.length})
        </span>
        <button
          type='button'
          onClick={() => setOpen(true)}
          className='inline-flex items-center gap-1 rounded-lg border border-[#e6dbcd] bg-white px-2.5 py-1 text-xs font-semibold text-[#455a54] hover:bg-[#fbf5ef]'
        >
          <Plus className='h-3.5 w-3.5' /> Cargar piezas
        </button>
      </div>

      {loading ? (
        <p className='text-sm text-[#7a6e6f]'>Cargando…</p>
      ) : pieces.length === 0 ? (
        <p className='rounded-lg border border-dashed border-[#e6dbcd] bg-[#fbf5ef] px-3 py-2 text-[13px] text-[#7a6e6f]'>
          Sin piezas cargadas para esta reserva.
        </p>
      ) : (
        <div className='flex flex-col gap-1.5'>
          {pieces.map((p) => (
            <div
              key={p._id}
              className='flex items-center gap-2 rounded-lg border border-[#e6dbcd] bg-white px-3 py-2'
            >
              <Flame className='h-3.5 w-3.5 shrink-0 text-[#9d684e]' />
              <span className='truncate text-[13px] font-medium text-[#3d3338]'>
                {p.personName || p.customerName || '—'}
              </span>
              {p.pieceType && (
                <span className='truncate text-[13px] text-[#7a6e6f]'>
                  · {p.pieceType}
                </span>
              )}
              <span className='ml-auto shrink-0 rounded-full bg-[#fbf5ef] px-2 py-0.5 text-[11px] font-medium text-[#455a54]'>
                {statusLabel(p.status)}
              </span>
            </div>
          ))}
        </div>
      )}

      {open && (
        <LoadReservationPiecesModal
          reservation={reservation}
          startIndex={pieces.length}
          onClose={() => setOpen(false)}
          onDone={async () => {
            setOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

type Entry = {
  personName: string;
  signature: string;
  pieceType: string;
  colorsUsed: string;
};

function LoadReservationPiecesModal({
  reservation,
  startIndex,
  onClose,
  onDone,
}: {
  reservation: ReservationItem;
  startIndex: number;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  // Arrancamos con una ficha por persona que todavía no tiene pieza cargada.
  const pending = Math.max(1, (reservation.quantity ?? 1) - startIndex);
  const [entries, setEntries] = useState<Entry[]>(
    Array.from({ length: pending }, (_, i) => ({
      personName: startIndex === 0 && i === 0 ? reservation.customerName ?? '' : '',
      signature: '',
      pieceType: '',
      colorsUsed: '',
    })),
  );
  const [saving, setSaving] = useState(false);

  function update(i: number, key: keyof Entry, value: string) {
    setEntries((cur) => cur.map((e, j) => (j === i ? { ...e, [key]: value } : e)));
  }

  async function submit() {
    if (
      entries.some((e) =>
        [e.personName, e.signature, e.pieceType, e.colorsUsed].some(
          (v) => !v.trim(),
        ),
      )
    ) {
      return showToast.error('Completá nombre, firma, pieza y colores de cada ficha');
    }
    setSaving(true);
    try {
      await piecesAdmin.createReservationBatch(
        reservation._id,
        entries.map((e) => ({
          personName: e.personName.trim(),
          signature: e.signature.trim(),
          pieceType: e.pieceType.trim(),
          colorsUsed: e.colorsUsed.trim(),
        })),
      );
      showToast.success(`${entries.length} ficha(s) cargadas`);
      await onDone();
    } catch (err) {
      showToast.error(
        err instanceof Error ? err.message : 'No se pudieron cargar las piezas',
      );
    } finally {
      setSaving(false);
    }
  }

  const field =
    'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader className='text-left'>
          <DialogTitle className='font-tan-nimbus text-xl text-[#455a54]'>
            Cargar piezas · {reservation.customerName ?? reservation.code}
          </DialogTitle>
        </DialogHeader>

        <div className='flex max-h-[55vh] flex-col gap-3 overflow-y-auto pr-1'>
          {entries.map((entry, index) => (
            <div
              key={index}
              className='rounded-xl border border-[#e6dbcd] bg-white p-3'
            >
              <div className='mb-2 flex items-center justify-between'>
                <span className='text-sm font-semibold text-[#455a54]'>
                  Ficha {index + 1}
                </span>
                {entries.length > 1 && (
                  <button
                    type='button'
                    onClick={() =>
                      setEntries((cur) => cur.filter((_, j) => j !== index))
                    }
                    className='text-xs text-[#a33] hover:underline'
                  >
                    Quitar
                  </button>
                )}
              </div>
              <div className='grid gap-2 sm:grid-cols-2'>
                <Input
                  value={entry.personName}
                  onChange={(e) => update(index, 'personName', e.target.value)}
                  placeholder='Nombre y apellido'
                  className={field}
                />
                <Input
                  value={entry.signature}
                  onChange={(e) => update(index, 'signature', e.target.value)}
                  placeholder='Firma en la pieza'
                  className={field}
                />
                <Input
                  value={entry.pieceType}
                  onChange={(e) => update(index, 'pieceType', e.target.value)}
                  placeholder='Pieza (taza, bowl…)'
                  className={field}
                />
                <Input
                  value={entry.colorsUsed}
                  onChange={(e) => update(index, 'colorsUsed', e.target.value)}
                  placeholder='Colores'
                  className={field}
                />
              </div>
            </div>
          ))}
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() =>
              setEntries((cur) => [
                ...cur,
                { personName: '', signature: '', pieceType: '', colorsUsed: '' },
              ])
            }
            className='w-fit gap-1 border-[#e6dbcd] text-[#455a54]'
          >
            <Plus className='h-3.5 w-3.5' /> Agregar otra ficha
          </Button>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='ghost'
            onClick={onClose}
            className='border border-[#e6dbcd] bg-white text-[#455a54]'
          >
            Cancelar
          </Button>
          <Button
            type='button'
            variant='verde'
            onClick={() => void submit()}
            disabled={saving || entries.length === 0}
          >
            {saving ? 'Guardando…' : 'Cargar piezas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
