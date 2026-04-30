'use client';

import { useState, useCallback } from 'react';
import { showToast } from '@/lib/toast';
import { egressesService, type Egress, type CreateEgressRequest, type UpdateEgressRequest, type EgressFilters, type EgressStatistics } from '@/services/egresses.service';
import type { ApiResponse } from '@/services/api.service';

export function useEgressesAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [egresses, setEgresses] = useState<Egress[]>([]);
  const [statistics, setStatistics] = useState<EgressStatistics | null>(null);

  // Create a new egress
  const createEgress = useCallback(async (egressData: CreateEgressRequest): Promise<Egress> => {
    setIsLoading(true);
    try {
      const response = await egressesService.createEgress(egressData);
      showToast.success('Egreso creado exitosamente');
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al crear el egreso';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get egresses with pagination and filters
  const getEgresses = useCallback(async (page = 1, limit = 10, filters?: EgressFilters) => {
    setIsLoading(true);
    try {
      const response = await egressesService.getEgresses(page, limit, filters);
      setEgresses(response.data.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener los egresos';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get all egresses without pagination
  const getAllEgresses = useCallback(async (): Promise<Egress[]> => {
    setIsLoading(true);
    try {
      const response = await egressesService.getAllEgresses();
      setEgresses(response.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener los egresos';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get egress by ID
  const getEgressById = useCallback(async (id: string): Promise<Egress> => {
    setIsLoading(true);
    try {
      const response = await egressesService.getEgressById(id);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener el egreso';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update egress
  const updateEgress = useCallback(async (id: string, egressData: UpdateEgressRequest): Promise<Egress> => {
    setIsLoading(true);
    try {
      const response = await egressesService.updateEgress(id, egressData);
      showToast.success('Egreso actualizado exitosamente');
      
      // Update local state
      setEgresses(prev => prev.map(egress => 
        egress._id === id ? response.data : egress
      ));
      
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al actualizar el egreso';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete egress
  const deleteEgress = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      await egressesService.deleteEgress(id);
      showToast.success('Egreso eliminado exitosamente');
      
      // Update local state
      setEgresses(prev => prev.filter(egress => egress._id !== id));
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al eliminar el egreso';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Complete egress
  const completeEgress = useCallback(async (id: string): Promise<Egress> => {
    setIsLoading(true);
    try {
      const response = await egressesService.completeEgress(id);
      showToast.success('Egreso completado exitosamente');
      
      // Update local state
      setEgresses(prev => prev.map(egress => 
        egress._id === id ? response.data : egress
      ));
      
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al completar el egreso';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cancel egress
  const cancelEgress = useCallback(async (id: string): Promise<Egress> => {
    setIsLoading(true);
    try {
      const response = await egressesService.cancelEgress(id);
      showToast.success('Egreso cancelado exitosamente');
      
      // Update local state
      setEgresses(prev => prev.map(egress => 
        egress._id === id ? response.data : egress
      ));
      
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al cancelar el egreso';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get egress statistics
  const getEgressStatistics = useCallback(async (filters?: {
    from?: string;
    to?: string;
    type?: string;
    currency?: string;
  }): Promise<EgressStatistics> => {
    setIsLoading(true);
    try {
      const response = await egressesService.getEgressStatistics(filters);
      setStatistics(response.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener las estadísticas';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search egresses
  const searchEgresses = useCallback(async (query: string, page = 1, limit = 10) => {
    setIsLoading(true);
    try {
      const response = await egressesService.searchEgresses(query, page, limit);
      setEgresses(response.data.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al buscar egresos';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh egresses (re-fetch current data)
  const refreshEgresses = useCallback(async () => {
    try {
      await getAllEgresses();
    } catch (error) {
      console.error('Error refreshing egresses:', error);
    }
  }, [getAllEgresses]);

  return {
    // State
    isLoading,
    egresses,
    statistics,
    
    // Actions
    createEgress,
    getEgresses,
    getAllEgresses,
    getEgressById,
    updateEgress,
    deleteEgress,
    completeEgress,
    cancelEgress,
    getEgressStatistics,
    searchEgresses,
    refreshEgresses,
  };
}
