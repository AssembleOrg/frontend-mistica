'use client';

import { useEffect, useState } from 'react';
import { piecesAdmin } from '@/services/pieces.admin.service';

/**
 * Fichas de piezas sin terminar por reserva (las que quedaron a medio cargar
 * en el borrador). Se recarga cuando cambian las reservas o `refreshKey`.
 */
export function usePieceDraftsPending(
  reservationIds: string[],
  enabled = true,
  refreshKey: unknown = 0,
): Map<string, number> {
  const [pending, setPending] = useState<Map<string, number>>(new Map());
  const key = [...reservationIds].sort().join(',');

  useEffect(() => {
    if (!enabled || !key) {
      setPending(new Map());
      return;
    }
    let alive = true;
    piecesAdmin
      .draftsPending(key.split(','))
      .then((rows) => {
        if (alive) setPending(new Map(rows.map((r) => [r.reservationId, r.pending])));
      })
      // Es un aviso: si no carga, las tarjetas se ven como siempre.
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key, enabled, refreshKey]);

  return pending;
}
