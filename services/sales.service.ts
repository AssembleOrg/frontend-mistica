// services/sales.service.ts

import { apiService, ApiResponse } from './api.service';
import type { paths } from '@/lib/api-types';

export type PaymentMethodCode = 'CASH' | 'CARD' | 'TRANSFER';

// Una línea de pago de la venta. Una venta puede tener varias (cash + card,
// cash + transfer, etc.). El backend valida que la suma iguale el total.
export interface SalePayment {
  method: PaymentMethodCode;
  amount: number;
  /** Fecha en la que se registró el pago (ISO). El server lo estampa en
   *  el momento del POST/PATCH; para ventas parciales esto permite atribuir
   *  cada pago a la sesión de caja correcta. */
  createdAt?: string;
}

export interface CreateSaleRequest {
  /** Nombre amigable opcional (ej. "Pepe"). El N° se sigue generando aparte. */
  name?: string;
  clientId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    /** Cantidad bonificada inline (regalada). Subtotal de línea =
     *  (quantity − bonifiedQty) * unitPrice. Backend valida ≤ quantity. */
    bonifiedQty?: number;
  }[];
  tax?: number;
  /** Distribución del pago — una entrada por método; suma === total. */
  payments: SalePayment[];
  notes?: string;
  prepaidId?: string;
  consumedPrepaid?: boolean;
  discount?: number;
  seller: string;
  /** Marca la venta como PARTIAL (seña/pago parcial). Σ payments puede ser
   *  menor al total; la diferencia queda como `balanceDue`. */
  isPartial?: boolean;
  /** Total de la venta cuando es PARTIAL y NO tiene items (servicio sin
   *  productos). Si hay items, el total se deriva normalmente. */
  partialTotal?: number;
}

/** Body para PATCH /sales/:id/payments — agrega pagos a una venta PARTIAL. */
export interface AddSalePaymentsRequest {
  payments: { method: PaymentMethodCode; amount: number }[];
  /** Si true, marca la venta como COMPLETED (cierra el saldo). */
  markCompleted?: boolean;
}

export type InvoiceType = 'A' | 'B' | 'C';
export type TaxCondition = 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL';

export interface UpdateSaleRequest {
  name?: string;
  clientId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: {
    productId: string;
    quantity: number;
    unitPrice: number;
    bonifiedQty?: number;
  }[];
  payments?: SalePayment[];
  notes?: string;
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'PARTIAL';
  prepaidId?: string;
  consumedPrepaid?: boolean;
  discount?: number;
  seller?: string;
  shouldInvoice?: boolean;
  // Datos AFIP cuando shouldInvoice=true. Si no se proveen, default Factura C.
  invoiceType?: InvoiceType;
  invoiceCuit?: string;
  invoiceTaxCondition?: TaxCondition;
  invoiceBusinessName?: string;
  invoiceFiscalAddress?: string;
}

export interface AfipContributor {
  cuit: string;
  businessName: string;
  taxCondition: TaxCondition | null;
  afipTaxConditionLabel: string | null;
  fiscalAddress: string;
  estado: string | null;
}

// Sale interfaces
export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  /** Cantidad bonificada (regalada). El subtotal ya viene calculado por el
   *  server como (quantity − bonifiedQty) * unitPrice. */
  bonifiedQty?: number;
}

/** Resumen liviano de una venta relacionada (para el distintivo informativo). */
export interface RelatedSaleSummary {
  id: string;
  saleNumber: string;
  name?: string;
  total: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'PARTIAL';
  createdAt: string;
}

export interface Sale {
  id: string;
  saleNumber: string;
  /** Nombre editable de la venta. Si está vacío, en la tabla se muestra "-". */
  name?: string;
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
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'PARTIAL';
  notes?: string;
  seller?: string;
  consumedPrepaid?: boolean;
  createdAt: string;
  updatedAt: string;
  // Campos opcionales de AFIP
  afipCae?: string;
  afipNumero?: number;
  afipFechaVto?: string;
  /** Saldo pendiente (sólo > 0 cuando status === 'PARTIAL'). */
  balanceDue?: number;
  /** Ids de ventas relacionadas (vínculo mutuo, informativo). Viene en la lista
   *  y el detalle; sirve para mostrar el distintivo 🔗. */
  relatedSaleIds?: string[];
  /** Resúmenes de las ventas relacionadas — sólo lo devuelve GET /sales/:id. */
  relatedSales?: RelatedSaleSummary[];
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
  async getSales(page: number = 1, limit: number = 10, filters?: {
    search?: string;
    status?: string;
    from?: string;
    to?: string;
    clientId?: string;
    paymentMethod?: string;
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
      if (filters.clientId) {
        params.append('clientId', filters.clientId);
      }
      if (filters.paymentMethod && filters.paymentMethod !== 'all') {
        params.append('paymentMethod', filters.paymentMethod);
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

  // Helper to clean payload and add required fields.
  // No exige items en CREATE: una venta sin productos toma el total del
  // "monto a cobrar" en los pagos. El backend valida el resto.
  private cleanPayload(data: any): any {
    const cleaned = { ...data };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });

    if (!cleaned.customerName || (typeof cleaned.customerName === 'string' && cleaned.customerName.trim() === '')) {
      if (cleaned.status !== "COMPLETED") {
        cleaned.customerName = 'Cliente Anónimo';
      }
    }

    // Items puede venir vacío: en ese caso el backend toma el total de los
    // pagos ("monto a cobrar") — venta sin productos. La validación de
    // "requiere productos O monto a cobrar > 0" ya la hace el formulario antes
    // de invocar este service.

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

  // Consulta del padrón AFIP por CUIT (para autocompletar al emitir factura A/B).
  async lookupAfipContributor(cuit: string): Promise<ApiResponse<AfipContributor>> {
    const params = new URLSearchParams({ cuit: cuit.replace(/\D/g, '') });
    return apiService.get<AfipContributor>(`/sales/afip/contributor?${params.toString()}`);
  }

  /** Renombra una venta (edición inline). String vacío deja la venta sin nombre. */
  async updateSaleName(id: string, name: string): Promise<ApiResponse<Sale>> {
    return apiService.patch<Sale>(`/sales/${id}/name`, { name });
  }

  /**
   * Define el set COMPLETO de ventas relacionadas (vínculo mutuo, informativo).
   * El backend reconcilia ambos lados. Pasar [] desvincula todo. No afecta
   * totales ni saldos.
   */
  async setSaleLinks(id: string, relatedSaleIds: string[]): Promise<ApiResponse<Sale>> {
    return apiService.patch<Sale>(`/sales/${id}/links`, { relatedSaleIds });
  }

  // Update existing sale
  async updateSale(id: string, updates: UpdateSaleRequest): Promise<ApiResponse<Sale>> {
    console.log('💰 SALES SERVICE: Actualizando venta:', id);
    const cleanedUpdates = this.cleanPayload(updates);
    const response = await apiService.patch<Sale>(`/sales/${id}`, cleanedUpdates);
    console.log('💰 SALES SERVICE: Venta actualizada:', response.data?.saleNumber);
    return response;
  }

  /**
   * Agrega pagos a una venta PARTIAL. El backend estampa `createdAt = now`
   * en cada pago nuevo, así cada pago entra a la sesión de caja del día en
   * que se registró. Si `markCompleted=true`, la venta pasa a COMPLETED.
   */
  async addSalePayments(id: string, req: AddSalePaymentsRequest): Promise<ApiResponse<Sale>> {
    console.log('💰 SALES SERVICE: Agregando pagos a venta parcial:', id);
    const response = await apiService.patch<Sale>(`/sales/${id}/payments`, { ...req });
    console.log('💰 SALES SERVICE: Pagos agregados; nuevo saldo:', response.data?.balanceDue);
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

    // Items opcional: una venta puede no tener productos (el total se toma
    // del "monto a cobrar" en los pagos). Si vienen items, los validamos.
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
