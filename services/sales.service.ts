// services/sales.service.ts

import { apiService, ApiResponse } from './api.service';
import type { paths } from '@/lib/api-types';

export type PaymentMethodCode = 'CASH' | 'CARD' | 'TRANSFER';

// Una línea de pago de la venta. Una venta puede tener varias (cash + card,
// cash + transfer, etc.). El backend valida que la suma iguale el total.
export interface SalePayment {
  method: PaymentMethodCode;
  amount: number;
  /** Sólo CASH: lo que entregó el cliente físicamente (≥ amount). */
  receivedAmount?: number;
  /** Sólo CASH: vuelto entregado al cliente (= receivedAmount - amount). */
  changeGiven?: number;
}

export interface CreateSaleRequest {
  clientId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  tax?: number;
  /** Distribución del pago — una entrada por método; suma === total. */
  payments: SalePayment[];
  notes?: string;
  prepaidId?: string;
  consumedPrepaid?: boolean;
  discount?: number;
}

export interface UpdateSaleRequest {
  clientId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  payments?: SalePayment[];
  notes?: string;
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  prepaidId?: string;
  consumedPrepaid?: boolean;
  discount?: number;
  shouldInvoice?: boolean;
}

// Sale interfaces
export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  clientId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  prepaidUsed?: number;
  prepaidId?: string;
  total: number;
  payments: SalePayment[];
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  consumedPrepaid?: boolean;
  createdAt: string;
  updatedAt: string;
  // Campos opcionales de AFIP
  afipCae?: string;
  afipNumero?: number;
  afipFechaVto?: string;
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

// Daily sales response
interface DailySalesData {
  date: string;
  timezone: string;
  sales: Sale[];
  summary: {
    totalSales: number;
    totalAmount: number;
    totalByPaymentMethod: {
      CASH: number;
      CARD: number;
      TRANSFER: number;
    };
    /** Total entregado de vuelto en cash en el rango. */
    totalCashChange: number;
    totalByStatus: {
      COMPLETED: number;
      PENDING: number;
      CANCELLED: number;
    };
  };
}

export class SalesService {
  // Get all sales with pagination
  async getSales(page: number = 1, limit: number = 10, filters?: {
    search?: string;
    status?: string;
    from?: string;
    to?: string;
  }): Promise<ApiResponse<PaginatedResponse<Sale>>> {
    console.log('💰 SALES SERVICE: Obteniendo ventas paginadas:', { page, limit, filters });
    
    // Construir parámetros de consulta
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      if (filters.search && filters.search.trim()) {
        params.append('search', filters.search.trim());
      }
      if (filters.status && filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.from) {
        params.append('from', filters.from);
      }
      if (filters.to) {
        params.append('to', filters.to);
      }
    }

    const url = `/sales/paginated?${params.toString()}`;
    console.log('💰 SALES SERVICE: URL construida:', url);
    
    const response = await apiService.get<PaginatedResponse<Sale>>(url);
    console.log('💰 SALES SERVICE: Ventas obtenidas:', response.data?.data?.length || 0);
    return response;
  }

  // Get all sales without pagination
  async getAllSales(): Promise<ApiResponse<Sale[]>> {
    console.log('💰 SALES SERVICE: Obteniendo todas las ventas');
    const response = await apiService.get<Sale[]>('/sales/all');
    console.log('💰 SALES SERVICE: Total de ventas:', response.data?.length || 0);
    return response;
  }

  // Get single sale by ID
  async getSale(id: string): Promise<ApiResponse<Sale>> {
    console.log('💰 SALES SERVICE: Obteniendo venta:', id);
    const response = await apiService.get<Sale>(`/sales/${id}`);
    console.log('💰 SALES SERVICE: Venta obtenida:', response.data?.saleNumber);
    return response;
  }

  // Helper to clean payload and add required fields
  private cleanPayload(data: any): any {
    const cleaned = { ...data };
    console.table(cleaned);
    // Remove undefined fields (backend doesn't accept undefined values)
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });
    
    // Ensure required fields have defaults
    if (!cleaned.customerName || (typeof cleaned.customerName === 'string' && cleaned.customerName.trim() === '')) {
      if (cleaned.status !== "COMPLETED") {
        cleaned.customerName = 'Cliente Anónimo';
      }
    }
    
    // Ensure items array is not empty
    if (!cleaned.items || !Array.isArray(cleaned.items) || cleaned.items.length === 0) {
      if (cleaned.status !== "COMPLETED") {
        throw new Error('La venta debe tener al menos un producto');
      }
    }
    
    return cleaned;
  }

  // Create new sale
  async createSale(saleData: CreateSaleRequest): Promise<ApiResponse<Sale>> {
    console.log('💰 SALES SERVICE: Creando venta para cliente:', saleData.customerName);
    const cleanedData = this.cleanPayload(saleData);
    const response = await apiService.post<Sale>('/sales', cleanedData);
    console.log('💰 SALES SERVICE: Venta creada:', response.data?.saleNumber);
    return response;
  }

  // Update existing sale
  async updateSale(id: string, updates: UpdateSaleRequest): Promise<ApiResponse<Sale>> {
    console.log('💰 SALES SERVICE: Actualizando venta:', id);
    const cleanedUpdates = this.cleanPayload(updates);
    const response = await apiService.patch<Sale>(`/sales/${id}`, cleanedUpdates);
    console.log('💰 SALES SERVICE: Venta actualizada:', response.data?.saleNumber);
    return response;
  }

  // Delete sale (soft delete)
  async deleteSale(id: string): Promise<ApiResponse<{ message: string }>> {
    console.log('💰 SALES SERVICE: Eliminando venta:', id);
    const response = await apiService.delete<{ message: string }>(`/sales/${id}`);
    console.log('💰 SALES SERVICE: Venta eliminada');
    return response;
  }

  // Get daily sales
  async getDailySales(date?: string, timezone = 'America/Argentina/Buenos_Aires'): Promise<ApiResponse<DailySalesData>> {
    console.log('💰 SALES SERVICE: Obteniendo ventas del día:', { date, timezone });
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    params.append('timezone', timezone);

    const response = await apiService.get<DailySalesData>(`/sales/daily?${params.toString()}`);
    console.log('💰 SALES SERVICE: Ventas del día obtenidas:', response.data?.summary?.totalSales || 0);
    return response;
  }

  // Get sales by date range
  async getSalesByDateRange(
    startDate: string,
    endDate: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Sale>>> {
    console.log('💰 SALES SERVICE: Obteniendo ventas por rango de fechas:', { startDate, endDate });
    const params = new URLSearchParams({
      startDate,
      endDate,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiService.get<PaginatedResponse<Sale>>(`/sales/date-range?${params.toString()}`);
    console.log('💰 SALES SERVICE: Ventas por rango obtenidas:', response.data?.data?.length || 0);
    return response;
  }

  // Get sales by customer
  async getSalesByCustomer(
    customerName: string,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Sale>>> {
    console.log('💰 SALES SERVICE: Obteniendo ventas por cliente:', customerName);
    const params = new URLSearchParams({
      customer: customerName,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiService.get<PaginatedResponse<Sale>>(`/sales/customer?${params.toString()}`);
    console.log('💰 SALES SERVICE: Ventas por cliente obtenidas:', response.data?.data?.length || 0);
    return response;
  }

  // Get sales by payment method (busca ventas que tengan al menos un pago de ese método)
  async getSalesByPaymentMethod(
    paymentMethod: PaymentMethodCode,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Sale>>> {
    const params = new URLSearchParams({
      paymentMethod,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiService.get<PaginatedResponse<Sale>>(
      `/sales/payment-method?${params.toString()}`
    );
    return response;
  }

  // Get sales statistics
  async getSalesStats(): Promise<ApiResponse<{
    totalSales: number;
    totalRevenue: number;
    averageSaleValue: number;
    salesByStatus: {
      COMPLETED: number;
      PENDING: number;
      CANCELLED: number;
    };
    salesByPaymentMethod: {
      CASH: number;
      CARD: number;
      TRANSFER: number;
    };
    topProducts: Array<{
      productId: string;
      productName: string;
      quantitySold: number;
      revenue: number;
    }>;
    dailyStats: Array<{
      date: string;
      sales: number;
      revenue: number;
    }>;
  }>> {
    console.log('💰 SALES SERVICE: Obteniendo estadísticas de ventas');
    const response = await apiService.get<{
      totalSales: number;
      totalRevenue: number;
      averageSaleValue: number;
      salesByStatus: {
        COMPLETED: number;
        PENDING: number;
        CANCELLED: number;
      };
      salesByPaymentMethod: {
        CASH: number;
        CARD: number;
        TRANSFER: number;
      };
      topProducts: Array<{
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
      }>;
      dailyStats: Array<{
        date: string;
        sales: number;
        revenue: number;
      }>;
    }>('/sales/stats');
    console.log('💰 SALES SERVICE: Estadísticas obtenidas');
    return response;
  }

  // Calculate sale totals
  calculateSaleTotals(items: Array<{ quantity: number; unitPrice: number }>): {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = 0; // No tax for now
    const discount = 0; // No discount for now
    const total = subtotal + tax - discount;

    return { subtotal, tax, discount, total };
  }

  // Validate sale data
  validateSaleData(saleData: CreateSaleRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!saleData.customerName || saleData.customerName.trim() === '') {
      errors.push('El nombre del cliente es requerido');
    }

    if (!saleData.items || saleData.items.length === 0) {
      errors.push('La venta debe tener al menos un producto');
    }

    if (saleData.items) {
      saleData.items.forEach((item: { productId: string; quantity: number; unitPrice: number }, index: number) => {
        if (!item.productId) {
          errors.push(`El producto ${index + 1} debe tener un ID válido`);
        }
        if (!item.quantity || item.quantity <= 0) {
          errors.push(`El producto ${index + 1} debe tener una cantidad válida`);
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          errors.push(`El producto ${index + 1} debe tener un precio válido`);
        }
      });
    }

    if (!saleData.payments || saleData.payments.length === 0) {
      errors.push('La venta debe tener al menos un pago');
    } else {
      const validMethods: PaymentMethodCode[] = ['CASH', 'CARD', 'TRANSFER'];
      const seen = new Set<PaymentMethodCode>();
      for (const p of saleData.payments) {
        if (!validMethods.includes(p.method)) {
          errors.push(`Método de pago inválido: ${p.method}`);
        }
        if (seen.has(p.method)) {
          errors.push(`Hay más de un pago en ${p.method} — combinálos en uno solo`);
        }
        seen.add(p.method);
        if (!p.amount || p.amount <= 0) {
          errors.push(`El monto del pago en ${p.method} debe ser mayor a 0`);
        }
        if (p.method === 'CASH' && p.receivedAmount !== undefined && p.receivedAmount < p.amount) {
          errors.push('El efectivo recibido no puede ser menor al monto a cobrar');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Generate sale number (if backend doesn't auto-generate)
  generateSaleNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    
    return `V-${year}${month}${day}-${timestamp}`;
  }

  // Export sales to CSV (if backend supports it)
  async exportSalesToCSV(
    startDate?: string,
    endDate?: string,
    format: 'csv' | 'excel' = 'csv'
  ): Promise<ApiResponse<{ downloadUrl: string }>> {
    console.log('💰 SALES SERVICE: Exportando ventas a', format.toUpperCase());
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('format', format);

    const response = await apiService.get<{ downloadUrl: string }>(`/sales/export?${params.toString()}`);
    console.log('💰 SALES SERVICE: Exportación completada');
    return response;
  }
}

// Export singleton instance
export const salesService = new SalesService();

// Export types for external use
export type { 
  PaginatedResponse, 
  DailySalesData
};
