import { apiService, type ApiResponse } from './api.service';

export interface CreditNote {
  id: string;
  noteNumber: string;
  saleId: string;
  saleNumber?: string;
  amount: number;
  reason?: string;
  status: 'AUTHORIZED' | 'FAILED' | 'CANCELLED' | 'INTERNAL';
  afipCae?: string;
  afipNumero?: number;
  afipFechaVto?: string;
  afipError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssueCreditNoteRequest {
  /** Si se omite, default = total de la venta. */
  amount?: number;
  reason?: string;
}

class CreditNotesService {
  async issueForSale(
    saleId: string,
    req: IssueCreditNoteRequest,
  ): Promise<ApiResponse<CreditNote>> {
    return apiService.post<CreditNote>(`/sales/${saleId}/credit-notes`, { ...req });
  }

  async findBySale(saleId: string): Promise<ApiResponse<CreditNote[]>> {
    return apiService.get<CreditNote[]>(`/sales/${saleId}/credit-notes`);
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<
    ApiResponse<{ data: CreditNote[]; total: number; page: number; limit: number }>
  > {
    return apiService.get<{
      data: CreditNote[];
      total: number;
      page: number;
      limit: number;
    }>(`/credit-notes?page=${page}&limit=${limit}`);
  }

  async findOne(id: string): Promise<ApiResponse<CreditNote>> {
    return apiService.get<CreditNote>(`/credit-notes/${id}`);
  }
}

export const creditNotesService = new CreditNotesService();
