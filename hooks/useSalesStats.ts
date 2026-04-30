// hooks/useSalesStats.ts
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { salesService, type Sale } from '@/services/sales.service';
import { usePrepaidsAPI } from './usePrepaidsAPI';
import { useEgressesAPI } from './useEgressesAPI';
import { showToast } from '@/lib/toast';

export interface SalesStatistics {
  // Ventas del día
  dailySales: {
    count: number;
    amount: number;
  };
  
  // Ingresos totales
  totalRevenue: {
    amount: number;
    period: string;
  };
  
  // Completadas
  completed: {
    count: number;
    percentage: number;
  };
  
  // Promedio por venta
  averagePerSale: {
    amount: number;
    description: string;
  };
  
  // Métodos de pago
  paymentMethods: {
    cash: { amount: number; percentage: number };
    card: { amount: number; percentage: number };
    transfer: { amount: number; percentage: number };
  };
  
  // Estado de las ventas
  salesStatus: {
    pending: { count: number; percentage: number };
    completed: { count: number; percentage: number };
    cancelled: { count: number; percentage: number };
  };
  
  // Estado total de la caja (incluyendo señas)
  totalCashStatus: {
    totalSales: number;
    totalPrepaids: number;
    totalEgresses: number;
    netBalance: number;
  };
}

export function useSalesStats() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  const prepaidsAPI = usePrepaidsAPI();
  const egressesAPI = useEgressesAPI();

  // Load all sales data
  const loadSales = useCallback(async () => {
    try {
      console.log('📊 Loading sales data...');
      const salesResponse = await salesService.getAllSales();
      setSales(salesResponse.data);
      console.log('📊 Sales loaded:', salesResponse.data.length);
    } catch (err) {
      console.error('Error loading sales:', err);
      setError('Error al cargar las ventas');
      showToast.error('Error', 'No se pudieron cargar las ventas');
    }
  }, []);

  // Load additional data (prepaids and egresses)
  const loadAdditionalData = useCallback(async () => {
    try {
      await Promise.all([
        prepaidsAPI.getAllPrepaids(),
        egressesAPI.getAllEgresses()
      ]);
    } catch (err) {
      console.error('Error loading additional data:', err);
    }
  }, [prepaidsAPI, egressesAPI]);

  // Load data only once on mount
  useEffect(() => {
    if (!hasLoaded) {
      setHasLoaded(true);
      setIsLoading(true);
      setError(null);
      
      const loadAllData = async () => {
        try {
          // Load sales data
          console.log('📊 Loading sales data...');
          const salesResponse = await salesService.getAllSales();
          setSales(salesResponse.data);
          console.log('📊 Sales loaded:', salesResponse.data.length);
          
          // Load additional data
          await Promise.all([
            prepaidsAPI.getAllPrepaids(),
            egressesAPI.getAllEgresses()
          ]);
        } catch (err) {
          console.error('Error loading data:', err);
          setError('Error al cargar los datos');
          showToast.error('Error', 'No se pudieron cargar los datos');
        } finally {
          setIsLoading(false);
        }
      };
      
      loadAllData();
    }
  }, [hasLoaded, prepaidsAPI, egressesAPI]);

  // Calculate statistics
  const statistics = useMemo((): SalesStatistics => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Filter today's sales
    const todaySales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= todayStart && saleDate <= todayEnd;
    });

    // Calculate daily sales
    const dailySalesCount = todaySales.length;
    const dailySalesAmount = todaySales.reduce((sum, sale) => sum + sale.total, 0);

    // Calculate total revenue (all time)
    const totalRevenueAmount = sales.reduce((sum, sale) => sum + sale.total, 0);

    // Calculate completed sales
    const completedSales = sales.filter(sale => sale.status === 'COMPLETED');
    const completedCount = completedSales.length;
    const completedPercentage = sales.length > 0 ? (completedCount / sales.length) * 100 : 0;

    // Calculate average per sale
    const averagePerSaleAmount = sales.length > 0 ? totalRevenueAmount / sales.length : 0;

    // Calculate payment methods
    const paymentMethods = sales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);

    const totalPaymentAmount = Object.values(paymentMethods).reduce((sum, amount) => sum + amount, 0);
    
    const cashAmount = paymentMethods.CASH || 0;
    const cardAmount = paymentMethods.CARD || 0;
    const transferAmount = paymentMethods.TRANSFER || 0;

    const cashPercentage = totalPaymentAmount > 0 ? (cashAmount / totalPaymentAmount) * 100 : 0;
    const cardPercentage = totalPaymentAmount > 0 ? (cardAmount / totalPaymentAmount) * 100 : 0;
    const transferPercentage = totalPaymentAmount > 0 ? (transferAmount / totalPaymentAmount) * 100 : 0;

    // Calculate sales status
    const statusCounts = sales.reduce((acc, sale) => {
      acc[sale.status] = (acc[sale.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pendingCount = statusCounts.PENDING || 0;
    const completedCountStatus = statusCounts.COMPLETED || 0;
    const cancelledCount = statusCounts.CANCELLED || 0;

    const pendingPercentage = sales.length > 0 ? (pendingCount / sales.length) * 100 : 0;
    const completedPercentageStatus = sales.length > 0 ? (completedCountStatus / sales.length) * 100 : 0;
    const cancelledPercentage = sales.length > 0 ? (cancelledCount / sales.length) * 100 : 0;

    // Calculate total cash status (including prepaids and egresses)
    const totalPrepaids = prepaidsAPI.prepaids.reduce((sum, prepaid) => sum + prepaid.amount, 0);
    const totalEgresses = egressesAPI.egresses.reduce((sum, egress) => sum + egress.amount, 0);
    const netBalance = totalRevenueAmount + totalPrepaids - totalEgresses;

    return {
      dailySales: {
        count: dailySalesCount,
        amount: dailySalesAmount,
      },
      totalRevenue: {
        amount: totalRevenueAmount,
        period: 'Hoy',
      },
      completed: {
        count: completedCount,
        percentage: completedPercentage,
      },
      averagePerSale: {
        amount: averagePerSaleAmount,
        description: 'Por transacción',
      },
      paymentMethods: {
        cash: { amount: cashAmount, percentage: cashPercentage },
        card: { amount: cardAmount, percentage: cardPercentage },
        transfer: { amount: transferAmount, percentage: transferPercentage },
      },
      salesStatus: {
        pending: { count: pendingCount, percentage: pendingPercentage },
        completed: { count: completedCountStatus, percentage: completedPercentageStatus },
        cancelled: { count: cancelledCount, percentage: cancelledPercentage },
      },
      totalCashStatus: {
        totalSales: totalRevenueAmount,
        totalPrepaids: totalPrepaids,
        totalEgresses: totalEgresses,
        netBalance: netBalance,
      },
    };
  }, [sales, prepaidsAPI.prepaids, egressesAPI.egresses]);

  // Refresh data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load sales data
      console.log('📊 Refreshing sales data...');
      const salesResponse = await salesService.getAllSales();
      setSales(salesResponse.data);
      console.log('📊 Sales refreshed:', salesResponse.data.length);
      
      // Load additional data
      await Promise.all([
        prepaidsAPI.getAllPrepaids(),
        egressesAPI.getAllEgresses()
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Error al actualizar los datos');
      showToast.error('Error', 'No se pudieron actualizar los datos');
    } finally {
      setIsLoading(false);
    }
  }, [prepaidsAPI, egressesAPI]);

  return {
    statistics,
    sales,
    isLoading: isLoading || prepaidsAPI.isLoading || egressesAPI.isLoading,
    error,
    refreshData,
  };
}
