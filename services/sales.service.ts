// services/sales.service.ts

import { apiService, ApiResponse } from './api.service';
import type { paths } from '@/lib/api-types';

// Define types manually since they might not be in the OpenAPI schema yet
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
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  notes?: string;
  prepaidId?: string;
  consumedPrepaid?: boolean;
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
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER';
  notes?: string;
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  prepaidId?: string;
  consumedPrepaid?: boolean;
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
  total: number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  prepaidId?: string;
  consumedPrepaid?: boolean;
  createdAt: string;
  updatedAt: string;
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
    totalByStatus: {
      COMPLETED: number;
      PENDING: number;
      CANCELLED: number;
    };
  };
}

export class SalesService {
  // Get all sales with pagination
  async getSales(page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Sale>>> {
    console.log('💰 SALES SERVICE: Obteniendo ventas paginadas:', { page, limit });
    const response = await apiService.getPaginated<PaginatedResponse<Sale>>('/sales', page, limit);
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
    
    // Remove undefined fields (backend doesn't accept undefined values)
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });
    
    // Ensure required fields have defaults
    if (!cleaned.customerName || (typeof cleaned.customerName === 'string' && cleaned.customerName.trim() === '')) {
      cleaned.customerName = 'Cliente Anónimo';
    }
    
    // Ensure items array is not empty
    if (!cleaned.items || !Array.isArray(cleaned.items) || cleaned.items.length === 0) {
      throw new Error('La venta debe tener al menos un producto');
    }
    
    // Ensure payment method is valid
    const validPaymentMethods = ['CASH', 'CARD', 'TRANSFER'];
    if (!validPaymentMethods.includes(cleaned.paymentMethod as string)) {
      cleaned.paymentMethod = 'CASH';
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

  // Get sales by payment method
  async getSalesByPaymentMethod(
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER',
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Sale>>> {
    console.log('💰 SALES SERVICE: Obteniendo ventas por método de pago:', paymentMethod);
    const params = new URLSearchParams({
      paymentMethod,
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiService.get<PaginatedResponse<Sale>>(`/sales/payment-method?${params.toString()}`);
    console.log('💰 SALES SERVICE: Ventas por método obtenidas:', response.data?.data?.length || 0);
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

    const validPaymentMethods = ['CASH', 'CARD', 'TRANSFER'];
    if (!validPaymentMethods.includes(saleData.paymentMethod)) {
      errors.push('El método de pago debe ser válido');
    }

    return {
      isValid: errors.length === 0,
      errors
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
