// hooks/useSalesStats.ts
'use client';

import { useCallback, useEffect, useMemo, useReducer } from 'react';
import { salesService, type Sale } from '@/services/sales.service';
import { prepaidsService, type Prepaid } from '@/services/prepaids.service';
import { egressesService, type Egress } from '@/services/egresses.service';
import { showToast } from '@/lib/toast';

export interface SalesStatistics {
  dailySales: { count: number; amount: number };
  totalRevenue: { amount: number; period: string };
  completed: { count: number; percentage: number };
  averagePerSale: { amount: number; description: string };
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
  totalCashStatus: {
    totalSales: number;
    totalPrepaids: number;
    totalEgresses: number;
    netBalance: number;
  };
}

type State = {
  sales: Sale[];
  prepaids: Prepaid[];
  egresses: Egress[];
  isLoading: boolean;
  error: string | null;
};

type Action =
  | { type: 'load:start' }
  | { type: 'load:success'; sales: Sale[]; prepaids: Prepaid[]; egresses: Egress[] }
  | { type: 'load:error'; error: string };

const initialState: State = {
  sales: [],
  prepaids: [],
  egresses: [],
  isLoading: true,
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'load:start':
      return { ...state, isLoading: true, error: null };
    case 'load:success':
      return {
        sales: action.sales,
        prepaids: action.prepaids,
        egresses: action.egresses,
        isLoading: false,
        error: null,
      };
    case 'load:error':
      return { ...state, isLoading: false, error: action.error };
    default:
      return state;
  }
}

export function useSalesStats() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadAll = useCallback(async () => {
    dispatch({ type: 'load:start' });
    try {
      const [salesRes, prepaidsRes, egressesRes] = await Promise.all([
        salesService.getAllSales(),
        prepaidsService.getAllPrepaids(),
        egressesService.getAllEgresses(),
      ]);
      dispatch({
        type: 'load:success',
        sales: salesRes.data,
        prepaids: prepaidsRes.data,
        egresses: egressesRes.data,
      });
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
    const { sales, prepaids, egresses } = state;
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      23,
      59,
      59,
      999
    );

    const todaySales = sales.filter((sale) => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= todayStart && saleDate <= todayEnd;
    });

    const dailySalesCount = todaySales.length;
    const dailySalesAmount = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const totalRevenueAmount = sales.reduce((sum, sale) => sum + sale.total, 0);

    const completedSales = sales.filter((sale) => sale.status === 'COMPLETED');
    const completedCount = completedSales.length;
    const completedPercentage = sales.length > 0 ? (completedCount / sales.length) * 100 : 0;
    const averagePerSaleAmount = sales.length > 0 ? totalRevenueAmount / sales.length : 0;

    let cashAmount = 0;
    let cardAmount = 0;
    let transferAmount = 0;
    let pendingCount = 0;
    let completedCountStatus = 0;
    let cancelledCount = 0;
    for (const sale of sales) {
      // Cada venta puede tener varios pagos; sumamos por método.
      for (const p of sale.payments ?? []) {
        if (p.method === 'CASH') cashAmount += p.amount;
        else if (p.method === 'CARD') cardAmount += p.amount;
        else if (p.method === 'TRANSFER') transferAmount += p.amount;
      }

      if (sale.status === 'PENDING') pendingCount++;
      else if (sale.status === 'COMPLETED') completedCountStatus++;
      else if (sale.status === 'CANCELLED') cancelledCount++;
    }
    const totalPaymentAmount = cashAmount + cardAmount + transferAmount;

    const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);

    const totalPrepaids = prepaids.reduce((sum, p) => sum + p.amount, 0);
    const totalEgresses = egresses.reduce((sum, e) => sum + e.amount, 0);
    const netBalance = totalRevenueAmount + totalPrepaids - totalEgresses;

    return {
      dailySales: { count: dailySalesCount, amount: dailySalesAmount },
      totalRevenue: { amount: totalRevenueAmount, period: 'Hoy' },
      completed: { count: completedCount, percentage: completedPercentage },
      averagePerSale: { amount: averagePerSaleAmount, description: 'Por transacción' },
      paymentMethods: {
        cash: { amount: cashAmount, percentage: pct(cashAmount, totalPaymentAmount) },
        card: { amount: cardAmount, percentage: pct(cardAmount, totalPaymentAmount) },
        transfer: { amount: transferAmount, percentage: pct(transferAmount, totalPaymentAmount) },
      },
      salesStatus: {
        pending: { count: pendingCount, percentage: pct(pendingCount, sales.length) },
        completed: {
          count: completedCountStatus,
          percentage: pct(completedCountStatus, sales.length),
        },
        cancelled: { count: cancelledCount, percentage: pct(cancelledCount, sales.length) },
      },
      totalCashStatus: {
        totalSales: totalRevenueAmount,
        totalPrepaids,
        totalEgresses,
        netBalance,
      },
    };
  }, [state]);

  return {
    statistics,
    sales: state.sales,
    isLoading: state.isLoading,
    error: state.error,
    refreshData: loadAll,
  };
}
