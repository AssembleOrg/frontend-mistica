import { apiService, type ApiResponse } from './api.service';

export interface CashSession {
  id: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  countedClosingCash?: number;
  expectedClosingCash?: number;
  discrepancy?: number;
  openingNotes?: string;
  closingNotes?: string;
  openedByUserId?: string;
  closedByUserId?: string;
}

export interface OpenCashSessionRequest {
  openingCash: number;
  notes?: string;
}

export interface CloseCashSessionRequest {
  countedClosingCash: number;
  notes?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean };
}

class CashboxService {
  async getCurrent(): Promise<ApiResponse<CashSession | null>> {
    return apiService.get<CashSession | null>('/cashbox/current');
  }

  async open(req: OpenCashSessionRequest): Promise<ApiResponse<CashSession>> {
    return apiService.post<CashSession>('/cashbox/open', { ...req });
  }

  async close(req: CloseCashSessionRequest): Promise<ApiResponse<CashSession>> {
    return apiService.post<CashSession>('/cashbox/close', { ...req });
  }

  async findAll(page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<CashSession>>> {
    return apiService.get<PaginatedResponse<CashSession>>(`/cashbox?page=${page}&limit=${limit}`);
  }

  async findOne(id: string): Promise<ApiResponse<CashSession>> {
    return apiService.get<CashSession>(`/cashbox/${id}`);
  }
}

export const cashboxService = new CashboxService();
