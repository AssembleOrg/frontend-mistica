// services/egresses.service.ts

import { apiService, type ApiResponse } from './api.service';
import { API_CONFIG } from '@/lib/api-config';

// Types for Egresses API
export interface Egress {
  _id: string;
  egressNumber: string;
  concept: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'UYU' | 'ARS' | 'BRL';
  type: 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER';
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER';
  /** false = gasto externo: cuenta en finanzas, no en el arqueo de caja. */
  affectsCashbox?: boolean;
  notes?: string;
  authorizedBy?: string;
  userId: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface CreateEgressRequest {
  concept: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'UYU' | 'ARS' | 'BRL';
  type: 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER';
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER';
  /** false = gasto externo: no descuenta del arqueo de la caja física. */
  affectsCashbox?: boolean;
  notes?: string;
  authorizedBy?: string;
  userId: string;
  [key: string]: unknown;
}

export interface UpdateEgressRequest {
  concept?: string;
  amount?: number;
  currency?: 'USD' | 'EUR' | 'UYU' | 'ARS' | 'BRL';
  type?: 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER';
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER';
  notes?: string;
  authorizedBy?: string;
  [key: string]: unknown;
}

export interface DeleteEgressPayload {
  /** Motivo del borrado (obligatorio, queda auditado). */
  reason: string;
  /** PIN del dueño, o... */
  pin?: string;
  /** ...contraseña del admin como respaldo si olvidó el PIN. */
  adminPassword?: string;
  [key: string]: unknown;
}

export interface EgressFilters {
  search?: string;
  from?: string;
  to?: string;
  type?: 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER';
  currency?: 'USD' | 'EUR' | 'UYU' | 'ARS' | 'BRL';
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

export interface EgressStatistics {
  totalEgresses: number;
  totalAmount: number;
  averageAmount: number;
  egressesByType: Record<string, number>;
  egressesByCurrency: Record<string, number>;
  egressesByStatus: Record<string, number>;
  monthlyTrend: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
}

interface PaginatedResponse<T> {
  data: T[];
  // El backend NestJS devuelve `meta`, no `pagination`.
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export class EgressesService {
  // Create a new egress
  async createEgress(egressData: CreateEgressRequest): Promise<ApiResponse<Egress>> {
    console.log('💰 EGRESSES SERVICE: Creando egreso:', egressData);
    
    const response = await apiService.post<Egress>(API_CONFIG.ENDPOINTS.EGRESSES.BASE, egressData);
    console.log('💰 EGRESSES SERVICE: Egreso creado:', response.data);
    return response;
  }

  // Get all egresses with pagination and filters
  async getEgresses(page: number = 1, limit: number = 10, filters?: EgressFilters): Promise<ApiResponse<PaginatedResponse<Egress>>> {
    console.log('💰 EGRESSES SERVICE: Obteniendo egresos paginados:', { page, limit, filters });
    
    // Build query parameters
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
      if (filters.type) {
        params.append('type', filters.type);
      }
      if (filters.currency) {
        params.append('currency', filters.currency);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }
    }

    // El listado paginado vive en `/egresses/all`; `/egresses` sólo acepta POST.
    const url = `${API_CONFIG.ENDPOINTS.EGRESSES.ALL}?${params.toString()}`;
    console.log('💰 EGRESSES SERVICE: URL construida:', url);

    const response = await apiService.get<unknown>(url);

    // Este endpoint devuelve el paginado crudo (`{data, meta}`), a diferencia
    // del resto que envuelve en `{success, message, data}`. Como
    // `apiService.handleResponse` hace `data.data || data` para desenvolver ese
    // sobre, acá llega el array de egresos ya pelado y `meta` se pierde.
    // Aceptamos ambas formas para no depender de ese detalle.
    const raw = response.data;
    const items: Egress[] = Array.isArray(raw)
      ? (raw as Egress[])
      : ((raw as PaginatedResponse<Egress>)?.data ?? []);
    const meta = Array.isArray(raw)
      ? undefined
      : (raw as PaginatedResponse<Egress>)?.meta;

    console.log('💰 EGRESSES SERVICE: Egresos obtenidos:', items.length);

    return {
      ...response,
      data: {
        data: items,
        // Sin `meta` (caso array plano) el total real se desconoce: usamos el
        // tamaño de la página, que es lo único cierto.
        meta: meta ?? {
          page,
          limit,
          total: items.length,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    };
  }

  // Get all egresses without pagination
  async getAllEgresses(): Promise<ApiResponse<Egress[]>> {
    console.log('💰 EGRESSES SERVICE: Obteniendo todos los egresos');
    return apiService.get<Egress[]>(API_CONFIG.ENDPOINTS.EGRESSES.ALL);
  }

  // Get egress by ID
  async getEgressById(id: string): Promise<ApiResponse<Egress>> {
    console.log('💰 EGRESSES SERVICE: Obteniendo egreso por ID:', id);
    return apiService.get<Egress>(`${API_CONFIG.ENDPOINTS.EGRESSES.BASE}/${id}`);
  }

  // Update egress
  async updateEgress(id: string, egressData: UpdateEgressRequest): Promise<ApiResponse<Egress>> {
    console.log('💰 EGRESSES SERVICE: Actualizando egreso:', id, egressData);
    return apiService.patch<Egress>(`${API_CONFIG.ENDPOINTS.EGRESSES.BASE}/${id}`, egressData);
  }

  // Delete egress (soft delete). Requiere PIN o contraseña del admin + motivo.
  async deleteEgress(
    id: string,
    payload: DeleteEgressPayload,
  ): Promise<ApiResponse<void>> {
    console.log('💰 EGRESSES SERVICE: Eliminando egreso:', id);
    return apiService.delete<void>(
      `${API_CONFIG.ENDPOINTS.EGRESSES.BASE}/${id}`,
      payload,
    );
  }

  // Complete egress
  async completeEgress(id: string): Promise<ApiResponse<Egress>> {
    console.log('💰 EGRESSES SERVICE: Completando egreso:', id);
    return apiService.patch<Egress>(`${API_CONFIG.ENDPOINTS.EGRESSES.BASE}/${id}/complete`);
  }

  // Cancel egress
  async cancelEgress(id: string): Promise<ApiResponse<Egress>> {
    console.log('💰 EGRESSES SERVICE: Cancelando egreso:', id);
    return apiService.patch<Egress>(`${API_CONFIG.ENDPOINTS.EGRESSES.BASE}/${id}/cancel`);
  }

  // Get egress statistics
  async getEgressStatistics(filters?: {
    from?: string;
    to?: string;
    type?: string;
    currency?: string;
  }): Promise<ApiResponse<EgressStatistics>> {
    console.log('💰 EGRESSES SERVICE: Obteniendo estadísticas de egresos:', filters);
    
    const params = new URLSearchParams();
    if (filters) {
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      if (filters.type) params.append('type', filters.type);
      if (filters.currency) params.append('currency', filters.currency);
    }

    const url = `${API_CONFIG.ENDPOINTS.EGRESSES.STATISTICS}?${params.toString()}`;
    console.log('💰 EGRESSES SERVICE: URL de estadísticas:', url);
    
    return apiService.get<EgressStatistics>(url);
  }

  // Search egresses
  async searchEgresses(query: string, page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Egress>>> {
    console.log('💰 EGRESSES SERVICE: Buscando egresos:', query);
    return this.getEgresses(page, limit, { search: query });
  }
}

// Export singleton instance
export const egressesService = new EgressesService();
