// hooks/useSalesStats.ts
'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { salesService, type Sale } from '@/services/sales.service';
import { showToast } from '@/lib/toast';

export interface SalesStatistics {
  dailySales: { count: number; amount: number };
  averagePerSale: { amount: number };
  paymentMethods: {
    cash: { amount: number; percentage: number };
    card: { amount: number; percentage: number };
    transfer: { amount: number; percentage: number };
  };
  salesStatus: {
    pending: { count: number; percentage: number };
    completed: { count: number; percentage: number };
    cancelled: { count: number; percentage: number };
  };
  topProductsToday: Array<{ productId: string; productName: string; quantity: number; revenue: number }>;
}

type State = {
  sales: Sale[];
  isLoading: boolean;
  error: string | null;
};

type Action =
  | { type: 'load:start' }
  | { type: 'load:success'; sales: Sale[] }
  | { type: 'load:error'; error: string };

const initialState: State = { sales: [], isLoading: true, error: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load:start':  return { ...state, isLoading: true, error: null };
    case 'load:success': return { sales: action.sales, isLoading: false, error: null };
    case 'load:error':  return { ...state, isLoading: false, error: action.error };
    default: return state;
  }
}

export function useSalesStats() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadAll = useCallback(async () => {
    dispatch({ type: 'load:start' });
    try {
      const res = await salesService.getAllSales();
      dispatch({ type: 'load:success', sales: res.data });
    } catch (err) {
      console.error('Error loading sales stats:', err);
      dispatch({ type: 'load:error', error: 'Error al cargar los datos' });
      showToast.error('Error', 'No se pudieron cargar los datos');
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const statistics = useMemo((): SalesStatistics => {
    const { sales } = state;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const todaySales = sales.filter((s) => {
      const d = new Date(s.createdAt);
      return d >= todayStart && d <= todayEnd;
    });

    const dailyAmount = todaySales.reduce((sum, s) => sum + s.total, 0);
    const avgPerSale  = todaySales.length > 0 ? dailyAmount / todaySales.length : 0;

    let cashAmount = 0, cardAmount = 0, transferAmount = 0;
    let pendingCount = 0, completedCount = 0, cancelledCount = 0;

    for (const s of todaySales) {
      for (const p of s.payments ?? []) {
        if (p.method === 'CASH') cashAmount += p.amount;
        else if (p.method === 'CARD') cardAmount += p.amount;
        else if (p.method === 'TRANSFER') transferAmount += p.amount;
      }
      if (s.status === 'PENDING') pendingCount++;
      else if (s.status === 'COMPLETED') completedCount++;
      else if (s.status === 'CANCELLED') cancelledCount++;
    }

    const payTotal = cashAmount + cardAmount + transferAmount;
    const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

    // Top productos de hoy
    const productMap = new Map<string, { productId: string; productName: string; quantity: number; revenue: number }>();
    for (const s of todaySales) {
      if (s.status === 'CANCELLED') continue;
      for (const item of s.items ?? []) {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue  += item.subtotal;
        } else {
          productMap.set(item.productId, {
            productId:   item.productId,
            productName: item.productName,
            quantity:    item.quantity,
            revenue:     item.subtotal,
          });
        }
      }
    }
    const topProductsToday = [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      dailySales:   { count: todaySales.length, amount: dailyAmount },
      averagePerSale: { amount: avgPerSale },
      paymentMethods: {
        cash:     { amount: cashAmount,     percentage: pct(cashAmount,     payTotal) },
        card:     { amount: cardAmount,     percentage: pct(cardAmount,     payTotal) },
        transfer: { amount: transferAmount, percentage: pct(transferAmount, payTotal) },
      },
      salesStatus: {
        pending:   { count: pendingCount,   percentage: pct(pendingCount,   todaySales.length) },
        completed: { count: completedCount, percentage: pct(completedCount, todaySales.length) },
        cancelled: { count: cancelledCount, percentage: pct(cancelledCount, todaySales.length) },
      },
      topProductsToday,
    };
  }, [state]);

  return {
    statistics,
    isLoading: state.isLoading,
    error: state.error,
    refreshData: loadAll,
  };
}
