'use client';

// Armado de pedidos. La profe marca "mandé al horno" a ojo (por día o por
// rango); después trae el cajón y acá recepción verifica pieza por pieza de
// quién es. Un pedido (reserva o alumno) recién se avisa cuando están TODAS
// sus piezas: un grupo puede venir repartido en dos cajones.

import { useCallback, useEffect, useState } from 'react';
import { Check, PackageCheck } from 'lucide-react';
import { showToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  piecesAdmin,
  type PieceAssemblyGroup,
  type PieceItem,
  type PieceStatusConfig,
} from '@/services/pieces.admin.service';

// "viernes 2 de octubre". Mediodía para que ninguna zona horaria lo corra.
function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function PiezasAssembly({
  statusCfg,
  canManage,
}: Readonly<{ statusCfg: PieceStatusConfig[]; canManage: boolean }>) {
  const [groups, setGroups] = useState<PieceAssemblyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const readyKey = statusCfg.find((c) => c.isReady)?.key ?? 'LISTA';
  const isFinal = (p: PieceItem) =>
    !!statusCfg.find((c) => c.key === p.status)?.isFinal;
  const isVerified = (p: PieceItem) => p.status === readyKey || isFinal(p);

  const load = useCallback(async () => {
    try {
      setGroups(await piecesAdmin.assembly());
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Tildar = la pieza está, verificada. Destildar la devuelve a "horneada".
  async function toggle(p: PieceItem) {
    setBusy(p._id);
    try {
      await piecesAdmin.update(p._id, {
        status: isVerified(p) ? 'HORNEADA' : readyKey,
      });
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setBusy(null);
    }
  }

  async function notify(group: PieceAssemblyGroup) {
    const piece = group.items.find((p) => p.status === readyKey);
    if (!piece) return;
    setBusy(group.key);
    try {
      await piecesAdmin.notifyReady(piece._id);
      showToast.success('Aviso de retiro enviado');
      await load();
    } catch (e) {
      showToast.error(e instanceof Error ? e.message : 'No se pudo enviar el aviso');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className='rounded-2xl border border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
        Cargando…
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <div className='rounded-2xl border border-dashed border-[#e6dbcd] bg-white p-6 text-sm text-[#7a6e6f]'>
        No hay pedidos para armar. Aparecen acá cuando la profe marca piezas
        como “Mandé al horno” desde Todas las piezas.
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-sm text-[#7a6e6f]'>
        Tildá cada pieza a medida que la encontrás en el cajón. El pedido se
        avisa cuando están todas.
      </p>
      <div className='grid gap-3 lg:grid-cols-2'>
        {groups.map((g) => (
          <div
            key={g.key}
            className={cn(
              'rounded-2xl border bg-white p-4',
              g.complete ? 'border-[#455a54]/50' : 'border-[#e6dbcd]',
            )}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold text-[#3d3338]'>
                  {g.name || 'Sin nombre'}
                </p>
                <p className='truncate text-xs text-[#7a6e6f]'>
                  {[
                    g.reservationCode && `Reserva ${g.reservationCode}`,
                    g.experienceName,
                    g.workDate && dayLabel(g.workDate),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                  g.complete
                    ? 'bg-[#dcebe1] text-[#2f4a40]'
                    : 'bg-[#f3e2d0] text-[#8a5638]',
                )}
              >
                {g.ready} de {g.total}
              </span>
            </div>

            <div className='mt-3 flex flex-col gap-1.5'>
              {g.items.map((p) => {
                const on = isVerified(p);
                const pending = p.status === 'PENDIENTE';
                return (
                  <button
                    key={p._id}
                    type='button'
                    disabled={busy === p._id || isFinal(p)}
                    onClick={() => toggle(p)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                      on
                        ? 'border-[#455a54]/40 bg-[#E7F0EC]'
                        : 'border-[#e6dbcd] bg-[#fbf5ef] hover:bg-[#f6efe6]',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-md border-2',
                        on
                          ? 'border-[#455a54] bg-[#455a54] text-white'
                          : 'border-[#455a54]/50 bg-white',
                      )}
                    >
                      {on && <Check className='size-4' />}
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-sm font-medium text-[#3d3338]'>
                        {p.personName || p.customerName || '—'}
                        <span className='ml-1.5 font-normal text-[#7a6e6f]'>
                          · {p.pieceType || 'Pieza sin detalle'}
                        </span>
                      </span>
                      <span className='block truncate text-xs text-[#7a6e6f]'>
                        {[
                          p.signature && `Firma: ${p.signature}`,
                          p.colorsUsed && `Colores: ${p.colorsUsed}`,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '—'}
                      </span>
                    </span>
                    {isFinal(p) ? (
                      <span className='shrink-0 text-[11px] text-[#5c5148]'>Retirada</span>
                    ) : pending && !on ? (
                      <span className='shrink-0 text-[11px] text-[#a99f92]'>
                        Sin hornear
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {g.complete && (
              <div className='mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#dcebe1] px-3 py-2'>
                <PackageCheck className='size-4 text-[#2f4a40]' />
                <span className='text-sm font-semibold text-[#2f4a40]'>
                  Pedido completo
                </span>
                {canManage ? (
                  <Button
                    type='button'
                    variant='verde'
                    size='sm'
                    disabled={busy === g.key}
                    onClick={() => notify(g)}
                    className='ml-auto h-8'
                  >
                    Avisar retiro
                  </Button>
                ) : (
                  <span className='ml-auto text-xs text-[#2f4a40]'>
                    Listo para avisar
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
