'use client';

import { useState, useCallback } from 'react';
import { showToast } from '@/lib/toast';
import { salesService, type Sale, type CreateSaleRequest, type SaleItem, type DailySalesData } from '@/services/sales.service';

export function useSalesAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [dailySales, setDailySales] = useState<DailySalesData | null>(null);

  const createSale = useCallback(async (saleData: CreateSaleRequest): Promise<Sale> => {
    setIsLoading(true);
    try {
      const response = await salesService.createSale(saleData);
      showToast.success('Venta creada exitosamente');
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al crear la venta';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSales = useCallback(async (page = 1, limit = 10) => {
    setIsLoading(true);
    try {
      const response = await salesService.getSales(page, limit);
      setSales(response.data.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener las ventas';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAllSales = useCallback(async (): Promise<Sale[]> => {
    setIsLoading(true);
    try {
      const response = await salesService.getAllSales();
      setSales(response.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener las ventas';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSaleById = useCallback(async (id: string): Promise<Sale> => {
    setIsLoading(true);
    try {
      const response = await salesService.getSale(id);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener la venta';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSale = useCallback(async (id: string, saleData: Partial<CreateSaleRequest>): Promise<Sale> => {
    setIsLoading(true);
    try {
      const response = await salesService.updateSale(id, saleData);
      showToast.success('Venta actualizada exitosamente');
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al actualizar la venta';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSale = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      await salesService.deleteSale(id);
      showToast.success('Venta eliminada exitosamente');
      // Remove from local state
      setSales(prev => prev.filter(sale => sale.id !== id));
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al eliminar la venta';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getDailySales = useCallback(async (date?: string, timezone = 'America/Argentina/Buenos_Aires'): Promise<DailySalesData> => {
    setIsLoading(true);
    try {
      const response = await salesService.getDailySales(date, timezone);
      setDailySales(response.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener las ventas del día';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    sales,
    dailySales,
    createSale,
    getSales,
    getAllSales,
    getSaleById,
    updateSale,
    deleteSale,
    getDailySales,
  };
}
