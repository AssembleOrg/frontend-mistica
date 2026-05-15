import { apiService, type ApiResponse } from './api.service';

export interface FinanceSummaryQuery {
  from?: string;
  to?: string;
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER';
  /** clientId real o `'anonymous'` para ventas sin cliente */
  clientId?: string;
  productId?: string;
  saleStatus?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

export interface FinanceSummary {
  range: { from: string | null; to: string | null };
  filters: Record<string, string | undefined>;

  salesCount: number;
  totalRevenue: number;
  averageTicket: number;

  byPaymentMethod: { CASH: number; CARD: number; TRANSFER: number };
  totalCashChange: number;

  byStatus: { PENDING: number; COMPLETED: number; CANCELLED: number };

  byClient: {
    named: { count: number; total: number };
    anonymous: { count: number; total: number };
  };

  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;

  expenses: {
    count: number;
    total: number;
    byPaymentMethod: { CASH: number; CARD: number; TRANSFER: number };
  };

  prepaids: {
    count: number;
    total: number;
    byPaymentMethod: { CASH: number; CARD: number; TRANSFER: number };
  };

  netBalance: number;

  cashSessions: Array<{
    id: string;
    openedAt: string;
    closedAt: string | null;
    openingCash: number;
    expectedClosingCash: number | null;
    countedClosingCash: number | null;
    discrepancy: number | null;
    status: 'OPEN' | 'CLOSED';
    closureType: 'MANUAL' | 'AUTO';
  }>;
  totalDiscrepancy: number;
}

class FinanceService {
  async summary(query: FinanceSummaryQuery): Promise<ApiResponse<FinanceSummary>> {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') params.append(k, String(v));
    }
    return apiService.get<FinanceSummary>(
      `/finance/summary${params.toString() ? `?${params.toString()}` : ''}`,
    );
  }
}

export const financeService = new FinanceService();
