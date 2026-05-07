// services/clients.service.ts

import { apiService, ApiResponse } from './api.service';
import type { PaymentMethodCode } from './sales.service';
import type { Prepaid } from './prepaids.service';

// Client interfaces
export interface Client {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  notes?: string;
  cuit?: string;
  prepaid: number; // Total de prepaids pendientes
  // Sólo viene poblado cuando se obtiene el cliente individualmente
  // (GET /clients/:id). En la lista paginada llega `undefined`.
  prepaids?: Prepaid[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateClientRequest {
  fullName: string;
  phone?: string;
  email?: string;
  notes?: string;
  cuit?: string;
  prepaids?: Array<{
    amount: number;
    paymentMethod: PaymentMethodCode;
    notes?: string;
  }>;
}

export interface UpdateClientRequest {
  fullName?: string;
  phone?: string;
  email?: string;
  notes?: string;
  cuit?: string;
  prepaids?: Array<{
    amount: number;
    paymentMethod: PaymentMethodCode;
    notes?: string;
  }>;
}

// Paginated response interface
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export class ClientsService {
  // Get all clients with pagination and filters
  async getClients(page: number = 1, limit: number = 10, filters?: {
    search?: string;
    from?: string;
    to?: string;
  }): Promise<ApiResponse<PaginatedResponse<Client>>> {
    console.log('👥 CLIENTS SERVICE: Obteniendo clientes paginados:', { page, limit, filters });
    
    // Construir parámetros de consulta
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      if (filters.search && filters.search.trim()) {
        params.append('search', filters.search.trim());
      }
      if (filters.from) {
        params.append('from', filters.from);
      }
      if (filters.to) {
        params.append('to', filters.to);
      }
    }

    const url = `/clients/paginated?${params.toString()}`;
    console.log('👥 CLIENTS SERVICE: URL construida:', url);
    
    const response = await apiService.get<PaginatedResponse<Client>>(url);
    console.log('👥 CLIENTS SERVICE: Clientes obtenidos:', response.data?.data?.length || 0);
    return response;
  }

  // Get all clients without pagination
  async getAllClients(): Promise<ApiResponse<Client[]>> {
    console.log('👥 CLIENTS SERVICE: Obteniendo todos los clientes');
    const response = await apiService.get<Client[]>('/clients/all');
    console.log('👥 CLIENTS SERVICE: Total de clientes:', response.data?.length || 0);
    return response;
  }

  // Get single client by ID
  async getClient(id: string): Promise<ApiResponse<Client>> {
    console.log('👥 CLIENTS SERVICE: Obteniendo cliente:', id);
    const response = await apiService.get<Client>(`/clients/${id}`);
    console.log('👥 CLIENTS SERVICE: Cliente obtenido:', response.data?.fullName);
    return response;
  }

  // Helper to clean payload and add required fields
  private cleanPayload(data: any): any {
    const cleaned = { ...data };
    
    // Remove undefined and empty string fields (backend rejects empty optional strings)
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined || cleaned[key] === '') {
        delete cleaned[key];
      }
    });
    
    // Ensure required fields have defaults
    if (!cleaned.fullName || (typeof cleaned.fullName === 'string' && cleaned.fullName.trim() === '')) {
      throw new Error('El nombre completo es requerido');
    }
    
    return cleaned;
  }

  // Create new client
  async createClient(clientData: CreateClientRequest): Promise<ApiResponse<Client>> {
    console.log('👥 CLIENTS SERVICE: Creando cliente:', clientData.fullName);
    const cleanedData = this.cleanPayload(clientData);
    const response = await apiService.post<Client>('/clients', cleanedData);
    console.log('👥 CLIENTS SERVICE: Cliente creado:', response.data?.fullName);
    return response;
  }

  // Update existing client
  async updateClient(id: string, updates: UpdateClientRequest): Promise<ApiResponse<Client>> {
    console.log('👥 CLIENTS SERVICE: Actualizando cliente:', id);
    const cleanedUpdates = this.cleanPayload(updates);
    const response = await apiService.patch<Client>(`/clients/${id}`, cleanedUpdates);
    console.log('👥 CLIENTS SERVICE: Cliente actualizado:', response.data?.fullName);
    return response;
  }

  // Delete client (soft delete)
  async deleteClient(id: string): Promise<ApiResponse<{ message: string }>> {
    console.log('👥 CLIENTS SERVICE: Eliminando cliente:', id);
    const response = await apiService.delete<{ message: string }>(`/clients/${id}`);
    console.log('👥 CLIENTS SERVICE: Cliente eliminado');
    return response;
  }

  // Get client prepaids
  async getClientPrepaids(clientId: string): Promise<ApiResponse<any[]>> {
    console.log('👥 CLIENTS SERVICE: Obteniendo prepaids del cliente:', clientId);
    const response = await apiService.get<any[]>(`/clients/${clientId}/prepaids`);
    console.log('👥 CLIENTS SERVICE: Prepaids obtenidos:', response.data?.length || 0);
    return response;
  }

  // Get client pending prepaids
  async getClientPendingPrepaids(clientId: string): Promise<ApiResponse<any[]>> {
    console.log('👥 CLIENTS SERVICE: Obteniendo prepaids pendientes del cliente:', clientId);
    const response = await apiService.get<any[]>(`/clients/${clientId}/prepaids/pending`);
    console.log('👥 CLIENTS SERVICE: Prepaids pendientes obtenidos:', response.data?.length || 0);
    return response;
  }

  // Search clients
  async searchClients(
    query: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Client>>> {
    console.log('👥 CLIENTS SERVICE: Buscando clientes:', query);
    const params = new URLSearchParams({
      search: query,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiService.get<PaginatedResponse<Client>>(`/clients/paginated?${params.toString()}`);
    console.log('👥 CLIENTS SERVICE: Resultados de búsqueda:', response.data?.data?.length || 0);
    return response;
  }

  // Get clients with low prepaid balance
  async getClientsWithLowPrepaid(threshold: number = 100): Promise<ApiResponse<Client[]>> {
    console.log('👥 CLIENTS SERVICE: Obteniendo clientes con prepaid bajo:', threshold);
    const params = new URLSearchParams({
      threshold: threshold.toString(),
    });

    const response = await apiService.get<Client[]>(`/clients/low-prepaid?${params.toString()}`);
    console.log('👥 CLIENTS SERVICE: Clientes con prepaid bajo obtenidos:', response.data?.length || 0);
    return response;
  }

  // Get client statistics
  async getClientStats(): Promise<ApiResponse<{
    totalClients: number;
    totalPrepaid: number;
    averagePrepaid: number;
    clientsWithPrepaid: number;
    clientsWithoutPrepaid: number;
    topClients: Array<{
      clientId: string;
      clientName: string;
      totalPrepaid: number;
    }>;
  }>> {
    console.log('👥 CLIENTS SERVICE: Obteniendo estadísticas de clientes');
    const response = await apiService.get<{
      totalClients: number;
      totalPrepaid: number;
      averagePrepaid: number;
      clientsWithPrepaid: number;
      clientsWithoutPrepaid: number;
      topClients: Array<{
        clientId: string;
        clientName: string;
        totalPrepaid: number;
      }>;
    }>('/clients/stats');
    console.log('👥 CLIENTS SERVICE: Estadísticas obtenidas');
    return response;
  }

  // Validate client data
  validateClientData(clientData: CreateClientRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!clientData.fullName || clientData.fullName.trim() === '') {
      errors.push('El nombre completo es requerido');
    }

    if (clientData.email && !this.isValidEmail(clientData.email)) {
      errors.push('El email debe tener un formato válido');
    }

    if (clientData.phone && !this.isValidPhone(clientData.phone)) {
      errors.push('El teléfono debe tener un formato válido');
    }

    // CUIT validation removed - now accepts any format

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper validation methods
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  // CUIT validation method removed - now accepts any format

  // Format client name for display
  formatClientName(client: Client): string {
    return `${client.fullName}${client.phone ? ` (${client.phone})` : ''}`;
  }

  // Get client prepaid status
  getClientPrepaidStatus(prepaid: number): { status: 'high' | 'medium' | 'low' | 'none'; color: string } {
    if (prepaid === 0) return { status: 'none', color: 'text-gray-500' };
    if (prepaid < 100) return { status: 'low', color: 'text-red-500' };
    if (prepaid < 500) return { status: 'medium', color: 'text-yellow-500' };
    return { status: 'high', color: 'text-green-500' };
  }
}

// Export singleton instance
export const clientsService = new ClientsService();

// Export types for external use
export type { 
  PaginatedResponse
};
