// hooks/useEgressBreakdown.ts

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { egressesService, type Egress } from '@/services/egresses.service';
import { egressTypeLabel, type EgressType } from '@/lib/egress-type-labels';

/** Tope de egresos que traemos en una sola página. Un mes normal entra holgado. */
const PAGE_LIMIT = 500;

export interface EgressBreakdownRow {
  type: EgressType;
  label: string;
  count: number;
  amount: number;
  /** Porcentaje sobre el total del período (0-100). */
  pct: number;
}

export interface EgressBreakdown {
  /** Tipos con al menos un egreso, de mayor a menor monto. */
  rows: EgressBreakdownRow[];
  /** Egresos del período, más recientes primero. */
  items: Egress[];
  total: number;
  count: number;
  loading: boolean;
  error: string | null;
  /** true si hay más egresos de los que trajimos: la vista está incompleta. */
  truncated: boolean;
  /** Cantidad real de egresos del período según el backend. */
  totalAvailable: number;
  reload: () => void;
}

interface Params {
  /** ISO YYYY-MM-DD. Si falta alguno, no se consulta. */
  from?: string;
  to?: string;
  /** Permite postergar la consulta hasta que el rango esté listo. */
  enabled?: boolean;
}

/**
 * Desglose de los egresos de un período, agrupado por tipo, más la lista
 * detallada.
 *
 * Agrupamos en el cliente sobre `GET /egresses` en vez de usar
 * `/egresses/statistics` porque ese endpoint no filtra por `status` y por lo
 * tanto incluiría egresos anulados: el desglose no cuadraría con el KPI de
 * egresos que se muestra al lado. Trayendo la lista tenemos una sola fuente de
 * verdad para el desglose, el detalle y el total.
 */
export function useEgressBreakdown({ from, to, enabled = true }: Params): EgressBreakdown {
  const [items, setItems] = useState<Egress[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shouldLoad = enabled && Boolean(from) && Boolean(to);

  const load = useCallback(async () => {
    if (!shouldLoad) {
      setItems([]);
      setTotalAvailable(0);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await egressesService.getEgresses(1, PAGE_LIMIT, { from, to });
      const page = Array.isArray(res.data?.data) ? res.data.data : [];
      // Los anulados no cuentan: el total tiene que cuadrar con el KPI de egresos.
      // Sin `createdAt` no se puede ordenar ni fechar la fila, así que se descarta.
      const active = page.filter((e) => e.status !== 'CANCELLED' && Boolean(e.createdAt));
      active.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setItems(active);
      setTotalAvailable(res.data?.meta?.total ?? active.length);
    } catch (err) {
      console.error('useEgressBreakdown:', err);
      setItems([]);
      setTotalAvailable(0);
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar el desglose de egresos',
      );
    } finally {
      setLoading(false);
    }
  }, [shouldLoad, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const { rows, total, count } = useMemo(() => {
    const acc = new Map<EgressType, { count: number; amount: number }>();
    let sum = 0;

    for (const e of items) {
      const key = e.type as EgressType;
      const prev = acc.get(key) ?? { count: 0, amount: 0 };
      acc.set(key, { count: prev.count + 1, amount: prev.amount + e.amount });
      sum += e.amount;
    }

    const built: EgressBreakdownRow[] = Array.from(acc.entries())
      .map(([type, data]) => ({
        type,
        label: egressTypeLabel(type),
        count: data.count,
        amount: data.amount,
        pct: sum > 0 ? (data.amount / sum) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { rows: built, total: sum, count: items.length };
  }, [items]);

  return {
    rows,
    items,
    total,
    count,
    loading,
    error,
    truncated: totalAvailable > PAGE_LIMIT,
    totalAvailable,
    reload: load,
  };
}
