import { apiService, type ApiResponse } from './api.service';

export interface CashSessionEditEntry {
  editedAt: string;
  editedByUserId?: string;
  addedEgresses: Array<{
    egressId: string;
    egressNumber: string;
    concept: string;
    amount: number;
    paymentMethod: string;
  }>;
  addedIncomes: Array<{
    incomeId: string;
    incomeNumber: string;
    concept: string;
    amount: number;
    paymentMethod: string;
  }>;
}

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
  editHistory?: CashSessionEditEntry[];
}

export interface RetroactiveEgressInput {
  concept: string;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  type: 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER';
  notes?: string;
}

export interface RetroactiveIncomeInput {
  concept: string;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  notes?: string;
}

export interface CreateCashIncomeRequest {
  concept: string;
  amount: number;
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER';
  notes?: string;
}

export interface CashIncomeResponse {
  id: string;
  incomeNumber: string;
  concept: string;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  notes?: string;
  createdAt: string;
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
  source: 'sale' | 'prepaid' | 'egress' | 'income';
  type: 'ingreso' | 'egreso';
  amount: number;
  description: string;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'MIXTO' | string;
  createdAt: string;
  reference?: string;
  afipCae?: string;
  // true cuando es seña: prepaid (saldo a favor) o venta con saldo pendiente
  // (status PARTIAL). Lo usa el chip "Seña" unificado del detalle de sesión.
  isSena?: boolean;
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

  /**
   * Preview en vivo del esperado en la caja abierta (mismo cálculo que el
   * cierre, sin escribir). Lo usa el diálogo "Cerrar caja" para mostrar al
   * cajero cuánto debería tener antes de tipear el conteo físico.
   */
  async getCurrentExpected(): Promise<ApiResponse<{
    sessionId: string;
    openedAt: string;
    openingCash: number;
    expectedClosingCash: number;
    asOf: string;
  } | null>> {
    return apiService.get('/cashbox/current/expected');
  }

  async open(req: OpenCashSessionRequest): Promise<ApiResponse<CashSession>> {
    return apiService.post<CashSession>('/cashbox/open', { ...req });
  }

  async close(req: CloseCashSessionRequest): Promise<ApiResponse<CashSession>> {
    return apiService.post<CashSession>('/cashbox/close', { ...req });
  }

  /**
   * Registra un ingreso puntual a la caja ABIERTA.
   * El backend stampa createdAt = now y el ingreso ya
   * suma al esperado de cierre. Falla con 409 si no hay caja abierta.
   */
  async createIncome(req: CreateCashIncomeRequest): Promise<ApiResponse<CashIncomeResponse>> {
    return apiService.post<CashIncomeResponse>('/cashbox/current/incomes', { ...req });
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

  /**
   * Edita una sesión cerrada: carga egresos y/o ingresos retroactivos. Sólo
   * permitido dentro de las 72hs siguientes a `closedAt` (validación en el
   * backend). Los movimientos se crean con createdAt = closedAt de la sesión,
   * así el arqueo recalcula correctamente. Backend exige al menos uno.
   */
  async editSession(
    id: string,
    body: { addEgresses?: RetroactiveEgressInput[]; addIncomes?: RetroactiveIncomeInput[] },
  ): Promise<ApiResponse<CashSession>> {
    return apiService.patch<CashSession>(`/cashbox/${id}/edit`, body);
  }
}

export const cashboxService = new CashboxService();
