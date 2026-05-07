'use client';

import { useState, useCallback } from 'react';
import { showToast } from '@/lib/toast';
import { clientsService, type Client, type CreateClientRequest, type UpdateClientRequest } from '@/services/clients.service';
import { log } from '@/lib/logger';

export function useClientsAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);

  const createClient = useCallback(async (clientData: CreateClientRequest): Promise<Client> => {
    setIsLoading(true);
    try {
      const response = await clientsService.createClient(clientData);
      showToast.success('Cliente creado exitosamente');
      return response.data;
    } catch (error) {
      log.error(error, error instanceof Error);
      const errorMessage =  (error as Error).message || 'Error al crear el cliente';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getClients = useCallback(async (page = 1, limit = 10) => {
    setIsLoading(true);
    try {
      const response = await clientsService.getClients(page, limit);
      setClients(response.data.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener los clientes';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAllClients = useCallback(async (): Promise<Client[]> => {
    setIsLoading(true);
    try {
      const response = await clientsService.getAllClients();
      setClients(response.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener los clientes';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getClientById = useCallback(async (id: string): Promise<Client> => {
    setIsLoading(true);
    try {
      const response = await clientsService.getClient(id);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener el cliente';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateClient = useCallback(async (id: string, clientData: UpdateClientRequest): Promise<Client> => {
    setIsLoading(true);
    try {
      const response = await clientsService.updateClient(id, clientData);
      showToast.success('Cliente actualizado exitosamente');
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al actualizar el cliente';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteClient = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      await clientsService.deleteClient(id);
      showToast.success('Cliente eliminado exitosamente');
      // Remove from local state
      setClients(prev => prev.filter(client => client.id !== id));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al eliminar el cliente';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchClients = useCallback(async (query: string, page = 1, limit = 10) => {
    setIsLoading(true);
    try {
      const response = await clientsService.searchClients(query, page, limit);
      setClients(response.data.data);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al buscar clientes';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getClientPrepaids = useCallback(async (clientId: string) => {
    setIsLoading(true);
    try {
      const response = await clientsService.getClientPrepaids(clientId);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener los prepaids del cliente';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getClientPendingPrepaids = useCallback(async (clientId: string) => {
    setIsLoading(true);
    try {
      const response = await clientsService.getClientPendingPrepaids(clientId);
      return response.data;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error al obtener los prepaids pendientes';
      showToast.error('Error', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    clients,
    createClient,
    getClients,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient,
    searchClients,
    getClientPrepaids,
    getClientPendingPrepaids,
  };
}
