// services/prepaids.service.ts

import { apiService, ApiResponse } from './api.service';

// Prepaid interfaces
export interface Prepaid {
  id: string;
  clientId: string;
  amount: number;
  status: 'PENDING' | 'CONSUMED';
  notes?: string;
  consumedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreatePrepaidRequest {
  amount: number;
  notes?: string;
}

export interface UpdatePrepaidRequest {
  amount?: number;
  notes?: string;
  status?: 'PENDING' | 'CONSUMED';
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

export class PrepaidsService {
  // Get all prepaids with pagination and filters
  async getPrepaids(page: number = 1, limit: number = 10, filters?: {
    search?: string;
    from?: string;
    to?: string;
    status?: string;
  }): Promise<ApiResponse<PaginatedResponse<Prepaid>>> {
    console.log('💰 PREPAIDS SERVICE: Obteniendo prepaids paginados:', { page, limit, filters });
    
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
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
    }

    const url = `/prepaids/paginated?${params.toString()}`;
    console.log('💰 PREPAIDS SERVICE: URL construida:', url);
    
    const response = await apiService.get<PaginatedResponse<Prepaid>>(url);
    console.log('💰 PREPAIDS SERVICE: Prepaids obtenidos:', response.data?.data?.length || 0);
    return response;
  }

  // Get all prepaids without pagination
  async getAllPrepaids(): Promise<ApiResponse<Prepaid[]>> {
    console.log('💰 PREPAIDS SERVICE: Obteniendo todos los prepaids');
    const response = await apiService.get<Prepaid[]>('/prepaids/all');
    console.log('💰 PREPAIDS SERVICE: Total de prepaids:', response.data?.length || 0);
    return response;
  }

  // Get single prepaid by ID
  async getPrepaid(id: string): Promise<ApiResponse<Prepaid>> {
    console.log('💰 PREPAIDS SERVICE: Obteniendo prepaid:', id);
    const response = await apiService.get<Prepaid>(`/prepaids/${id}`);
    console.log('💰 PREPAIDS SERVICE: Prepaid obtenido');
    return response;
  }

  // Get prepaids by client ID
  async getPrepaidsByClient(clientId: string): Promise<ApiResponse<Prepaid[]>> {
    console.log('💰 PREPAIDS SERVICE: Obteniendo prepaids del cliente:', clientId);
    const response = await apiService.get<Prepaid[]>(`/prepaids/client/${clientId}`);
    console.log('💰 PREPAIDS SERVICE: Prepaids del cliente obtenidos:', response.data?.length || 0);
    return response;
  }

  // Helper to clean payload and add required fields
  private cleanPayload(data: any): any {
    const cleaned = { ...data };
    
    // Remove undefined fields (backend doesn't accept undefined values)
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });
    
    return cleaned;
  }

  // Create new prepaid for client
  async createPrepaid(clientId: string, prepaidData: CreatePrepaidRequest): Promise<ApiResponse<Prepaid>> {
    console.log('💰 PREPAIDS SERVICE: Creando prepaid para cliente:', clientId, 'Monto:', prepaidData.amount);
    const cleanedData = this.cleanPayload(prepaidData);
    const response = await apiService.post<Prepaid>(`/prepaids/${clientId}`, cleanedData);
    console.log('💰 PREPAIDS SERVICE: Prepaid creado');
    return response;
  }

  // Update existing prepaid
  async updatePrepaid(id: string, updates: UpdatePrepaidRequest): Promise<ApiResponse<Prepaid>> {
    console.log('💰 PREPAIDS SERVICE: Actualizando prepaid:', id);
    const cleanedUpdates = this.cleanPayload(updates);
    const response = await apiService.patch<Prepaid>(`/prepaids/${id}`, cleanedUpdates);
    console.log('💰 PREPAIDS SERVICE: Prepaid actualizado');
    return response;
  }

  // Delete prepaid (soft delete)
  async deletePrepaid(id: string): Promise<ApiResponse<{ message: string }>> {
    console.log('💰 PREPAIDS SERVICE: Eliminando prepaid:', id);
    const response = await apiService.delete<{ message: string }>(`/prepaids/${id}`);
    console.log('💰 PREPAIDS SERVICE: Prepaid eliminado');
    return response;
  }

  // Get prepaids for a specific client
  async getClientPrepaids(clientId: string): Promise<ApiResponse<Prepaid[]>> {
    console.log('💰 PREPAIDS SERVICE: Obteniendo prepaids del cliente:', clientId);
    const response = await apiService.get<Prepaid[]>(`/prepaids/client/${clientId}`);
    console.log('💰 PREPAIDS SERVICE: Prepaids del cliente obtenidos:', response.data?.length || 0);
    return response;
  }

  // Get pending prepaids for a specific client
  async getClientPendingPrepaids(clientId: string): Promise<ApiResponse<Prepaid[]>> {
    console.log('💰 PREPAIDS SERVICE: Obteniendo prepaids pendientes del cliente:', clientId);
    const response = await apiService.get<Prepaid[]>(`/prepaids/client/${clientId}/pending`);
    console.log('💰 PREPAIDS SERVICE: Prepaids pendientes obtenidos:', response.data?.length || 0);
    return response;
  }

  // Get total pending amount for a client
  async getClientTotalPrepaid(clientId: string): Promise<ApiResponse<{ total: number }>> {
    console.log('💰 PREPAIDS SERVICE: Obteniendo total de prepaid del cliente:', clientId);
    const response = await apiService.get<{ total: number }>(`/prepaids/client/${clientId}/total`);
    console.log('💰 PREPAIDS SERVICE: Total obtenido:', response.data?.total || 0);
    return response;
  }

  // Get prepaids by status
  async getPrepaidsByStatus(
    status: 'PENDING' | 'CONSUMED',
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      from?: string;
      to?: string;
    }
  ): Promise<ApiResponse<PaginatedResponse<Prepaid>>> {
    console.log('💰 PREPAIDS SERVICE: Obteniendo prepaids por estado:', { status, page, limit, filters });
    
    const params = new URLSearchParams({
      status,
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

    const url = `/prepaids/status?${params.toString()}`;
    console.log('💰 PREPAIDS SERVICE: URL construida:', url);
    
    const response = await apiService.get<PaginatedResponse<Prepaid>>(url);
    console.log('💰 PREPAIDS SERVICE: Prepaids por estado obtenidos:', response.data?.data?.length || 0);
    return response;
  }

  // Get prepaids by date range
  async getPrepaidsByDateRange(
    startDate: string,
    endDate: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Prepaid>>> {
    console.log('💰 PREPAIDS SERVICE: Obteniendo prepaids por rango de fechas:', { startDate, endDate });
    const params = new URLSearchParams({
      startDate,
      endDate,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiService.get<PaginatedResponse<Prepaid>>(`/prepaids/date-range?${params.toString()}`);
    console.log('💰 PREPAIDS SERVICE: Prepaids por rango obtenidos:', response.data?.data?.length || 0);
    return response;
  }

  // Get prepaid statistics
  async getPrepaidStats(): Promise<ApiResponse<{
    totalPrepaids: number;
    totalAmount: number;
    pendingAmount: number;
    consumedAmount: number;
    averagePrepaid: number;
    prepaidsByStatus: {
      PENDING: number;
      CONSUMED: number;
    };
    topClients: Array<{
      clientId: string;
      clientName: string;
      totalPrepaid: number;
      pendingAmount: number;
    }>;
    dailyStats: Array<{
      date: string;
      prepaids: number;
      amount: number;
    }>;
  }>> {
    console.log('💰 PREPAIDS SERVICE: Obteniendo estadísticas de prepaids');
    const response = await apiService.get<{
      totalPrepaids: number;
      totalAmount: number;
      pendingAmount: number;
      consumedAmount: number;
      averagePrepaid: number;
      prepaidsByStatus: {
        PENDING: number;
        CONSUMED: number;
      };
      topClients: Array<{
        clientId: string;
        clientName: string;
        totalPrepaid: number;
        pendingAmount: number;
      }>;
      dailyStats: Array<{
        date: string;
        prepaids: number;
        amount: number;
      }>;
    }>('/prepaids/stats');
    console.log('💰 PREPAIDS SERVICE: Estadísticas obtenidas');
    return response;
  }

  // Mark prepaid as consumed
  async markAsConsumed(id: string, notes?: string): Promise<ApiResponse<Prepaid>> {
    console.log('💰 PREPAIDS SERVICE: Marcando prepaid como consumido:', id);
    const response = await apiService.patch<Prepaid>(`/prepaids/${id}/consume`, { notes });
    console.log('💰 PREPAIDS SERVICE: Prepaid marcado como consumido');
    return response;
  }

  // Validate prepaid data
  validatePrepaidData(prepaidData: CreatePrepaidRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!prepaidData.amount || prepaidData.amount <= 0) {
      errors.push('El monto debe ser mayor a 0');
    }

    if (prepaidData.amount > 100000) {
      errors.push('El monto no puede ser mayor a $100,000');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get prepaid status badge info
  getPrepaidStatusBadge(status: 'PENDING' | 'CONSUMED'): { 
    variant: 'default' | 'secondary' | 'outline';
    text: string;
    color: string;
  } {
    switch (status) {
      case 'PENDING':
        return {
          variant: 'outline',
          text: 'Pendiente',
          color: 'text-yellow-600'
        };
      case 'CONSUMED':
        return {
          variant: 'secondary',
          text: 'Consumido',
          color: 'text-gray-600'
        };
      default:
        return {
          variant: 'default',
          text: 'Desconocido',
          color: 'text-gray-500'
        };
    }
  }

  // Format currency for display
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(amount);
  }

  // Calculate total from prepaids array
  calculateTotal(prepaids: Prepaid[]): number {
    return prepaids.reduce((total, prepaid) => total + prepaid.amount, 0);
  }

  // Calculate pending total from prepaids array
  calculatePendingTotal(prepaids: Prepaid[]): number {
    return prepaids
      .filter(prepaid => prepaid.status === 'PENDING')
      .reduce((total, prepaid) => total + prepaid.amount, 0);
  }
}

// Export singleton instance
export const prepaidsService = new PrepaidsService();

// Export types for external use
export type { 
  PaginatedResponse
};
