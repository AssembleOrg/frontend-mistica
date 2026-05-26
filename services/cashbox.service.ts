import { apiService, type ApiResponse } from './api.service';

export interface CashSession {
  id: string;
  status: 'OPEN' | 'CLOSED';
  label?: string;
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
  closureType?: 'MANUAL' | 'AUTO';
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

export interface SessionTransaction {
  id: string;
  source: 'sale' | 'prepaid' | 'egress';
  type: 'ingreso' | 'egreso';
  amount: number;
  description: string;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'MIXTO' | string;
  createdAt: string;
  reference?: string;
  afipCae?: string;
}

export interface SessionTransactionsResponse {
  sessionId: string;
  transactions: SessionTransaction[];
}

class CashboxService {
  async getCurrent(): Promise<ApiResponse<CashSession | null>> {
    return apiService.get<CashSession | null>('/cashbox/current');
  }

  async getPendingAutoClosure(): Promise<ApiResponse<CashSession | null>> {
    return apiService.get<CashSession | null>('/cashbox/pending-auto-closure');
  }

  async open(req: OpenCashSessionRequest): Promise<ApiResponse<CashSession>> {
    return apiService.post<CashSession>('/cashbox/open', { ...req });
  }

  async close(req: CloseCashSessionRequest): Promise<ApiResponse<CashSession>> {
    return apiService.post<CashSession>('/cashbox/close', { ...req });
  }

  async resolveAutoClosure(id: string, req: CloseCashSessionRequest): Promise<ApiResponse<CashSession>> {
    return apiService.patch<CashSession>(`/cashbox/${id}/resolve-auto`, { ...req });
  }

  async findAll(page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<CashSession>>> {
    return apiService.get<PaginatedResponse<CashSession>>(`/cashbox?page=${page}&limit=${limit}`);
  }

  async findOne(id: string): Promise<ApiResponse<CashSession>> {
    return apiService.get<CashSession>(`/cashbox/${id}`);
  }

  async getSessionTransactions(id: string): Promise<ApiResponse<SessionTransactionsResponse>> {
    return apiService.get<SessionTransactionsResponse>(`/cashbox/${id}/transactions`);
  }

  async updateSessionLabel(id: string, label: string): Promise<ApiResponse<CashSession>> {
    return apiService.patch<CashSession>(`/cashbox/${id}/label`, { label });
  }
}

export const cashboxService = new CashboxService();
