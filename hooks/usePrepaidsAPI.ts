'use client';

import { useState, useCallback } from 'react';
import { showToast } from '@/lib/toast';
import { prepaidsService, type Prepaid, type CreatePrepaidRequest, type UpdatePrepaidRequest } from '@/services/prepaids.service';
import type { ApiResponse } from '@/services/api.service';

export function usePrepaidsAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [prepaids, setPrepaids] = useState<Prepaid[]>([]);

  const createPrepaid = useCallback(async (clientId: string, prepaidData: CreatePrepaidRequest): Promise<Prepaid> => {
    setIsLoading(true);
    try {
      const response = await prepaidsService.createPrepaid(clientId, prepaidData);
      showToast.success('Seña creada exitosamente');
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al crear la seña';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPrepaids = useCallback(async (page = 1, limit = 10) => {
    setIsLoading(true);
    try {
      const response = await prepaidsService.getPrepaids(page, limit);
      setPrepaids(response.data.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener las señas';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAllPrepaids = useCallback(async (): Promise<Prepaid[]> => {
    setIsLoading(true);
    try {
      const response = await prepaidsService.getAllPrepaids();
      setPrepaids(response.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener las señas';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPrepaidById = useCallback(async (id: string): Promise<Prepaid> => {
    setIsLoading(true);
    try {
      const response = await prepaidsService.getPrepaid(id);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener la seña';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPrepaidsByClient = useCallback(async (clientId: string): Promise<ApiResponse<Prepaid[]>> => {
    setIsLoading(true);
    try {
      const response = await prepaidsService.getPrepaidsByClient(clientId);
      return response;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener las señas del cliente';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePrepaid = useCallback(async (id: string, prepaidData: UpdatePrepaidRequest): Promise<Prepaid> => {
    setIsLoading(true);
    try {
      const response = await prepaidsService.updatePrepaid(id, prepaidData);
      showToast.success('Seña actualizada exitosamente');
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al actualizar la seña';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deletePrepaid = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      await prepaidsService.deletePrepaid(id);
      showToast.success('Seña eliminada exitosamente');
      // Remove from local state
      setPrepaids(prev => prev.filter(prepaid => prepaid.id !== id));
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al eliminar la seña';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getClientPrepaids = useCallback(async (clientId: string) => {
    setIsLoading(true);
    try {
      const response = await prepaidsService.getClientPrepaids(clientId);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener las señas del cliente';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getClientPendingPrepaids = useCallback(async (clientId: string) => {
    setIsLoading(true);
    try {
      const response = await prepaidsService.getClientPendingPrepaids(clientId);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener las señas pendientes';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getClientTotalPrepaid = useCallback(async (clientId: string) => {
    setIsLoading(true);
    try {
      const response = await prepaidsService.getClientTotalPrepaid(clientId);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener el total de señas';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsConsumed = useCallback(async (id: string, notes?: string): Promise<Prepaid> => {
    setIsLoading(true);
    try {
      const response = await prepaidsService.markAsConsumed(id, notes);
      showToast.success('Seña marcada como consumida');
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al marcar la seña como consumida';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getPrepaidsByStatus = useCallback(async (status: 'PENDING' | 'CONSUMED', page = 1, limit = 10) => {
    setIsLoading(true);
    try {
      const response = await prepaidsService.getPrepaidsByStatus(status, page, limit);
      setPrepaids(response.data.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener las señas por estado';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    prepaids,
    createPrepaid,
    getPrepaids,
    getAllPrepaids,
    getPrepaidById,
    getPrepaidsByClient,
    updatePrepaid,
    deletePrepaid,
    getClientPrepaids,
    getClientPendingPrepaids,
    getClientTotalPrepaid,
    markAsConsumed,
    getPrepaidsByStatus,
  };
}
