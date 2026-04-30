// lib/egress-types.ts
// Types for Egresses API based on swaggerendpoints.json

export interface Egress {
  _id: string;
  egressNumber: string;
  concept: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'UYU' | 'ARS' | 'BRL';
  type: 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER';
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER';
  notes?: string;
  authorizedBy?: string;
  userId: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface CreateEgressDto {
  concept: string;
  amount: number;
  currency: 'USD' | 'EUR' | 'UYU' | 'ARS' | 'BRL';
  type: 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER';
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER';
  notes?: string;
  authorizedBy?: string;
  userId: string;
}

export interface UpdateEgressDto {
  concept?: string;
  amount?: number;
  currency?: 'USD' | 'EUR' | 'UYU' | 'ARS' | 'BRL';
  type?: 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER';
  paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER';
  notes?: string;
  authorizedBy?: string;
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

export interface EgressFilters {
  search?: string;
  from?: string;
  to?: string;
  type?: 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER';
  currency?: 'USD' | 'EUR' | 'UYU' | 'ARS' | 'BRL';
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  page?: number;
  limit?: number;
}

// API Response types
export interface PaginatedEgressResponse {
  data: Egress[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Mapping from local types to API types
export interface LocalToApiEgressMapping {
  // Maps local Expense type to API CreateEgressDto
  mapExpenseToCreateEgress: (expense: {
    description: string;
    amount: number;
    category: string;
    paymentMethod: string;
    notes?: string;
  }) => Omit<CreateEgressDto, 'userId'>;
  
  // Maps API Egress to local Expense type
  mapApiEgressToExpense: (egress: Egress) => {
    id: string;
    description: string;
    amount: number;
    category: 'operativo' | 'compras' | 'servicios' | 'otros';
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER';
    notes?: string;
    userId: string;
    createdAt: Date;
  };
}

// Helper functions for type mapping
export const egressMapping: LocalToApiEgressMapping = {
  mapExpenseToCreateEgress: (expense) => ({
    concept: expense.description,
    amount: expense.amount,
    currency: 'USD', // Default currency, can be made configurable
    type: mapCategoryToEgressType(expense.category),
    paymentMethod: mapPaymentMethodToPaymentMethod(expense.paymentMethod),
    notes: expense.notes,
    authorizedBy: undefined, // Can be added to local form if needed
  }),
  
  mapApiEgressToExpense: (egress) => ({
    id: egress._id,
    description: egress.concept,
    amount: egress.amount,
    category: mapEgressTypeToCategory(egress.type),
    paymentMethod: mapApiPaymentMethodToLocal(egress.paymentMethod),
    notes: egress.notes,
    userId: egress.userId,
    createdAt: new Date(egress.createdAt),
  }),
};

// Helper function to map local categories to API egress types
function mapCategoryToEgressType(category: string): 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER' {
  const categoryMap: Record<string, 'WITHDRAWAL' | 'EXPENSE' | 'REFUND' | 'TRANSFER' | 'OTHER'> = {
    'compras_inventario': 'EXPENSE',
    'servicios_publicos': 'EXPENSE',
    'alquiler': 'EXPENSE',
    'sueldos': 'EXPENSE',
    'marketing': 'EXPENSE',
    'mantenimiento': 'EXPENSE',
    'impuestos': 'EXPENSE',
    'otros': 'OTHER',
    // Map local expense categories
    'operativo': 'EXPENSE',
    'compras': 'EXPENSE',
    'servicios': 'EXPENSE',
  };
  
  return categoryMap[category] || 'OTHER';
}

// Helper function to map API egress types to local categories
function mapEgressTypeToCategory(type: string): 'operativo' | 'compras' | 'servicios' | 'otros' {
  const typeMap: Record<string, 'operativo' | 'compras' | 'servicios' | 'otros'> = {
    'WITHDRAWAL': 'operativo',
    'EXPENSE': 'operativo',
    'REFUND': 'otros',
    'TRANSFER': 'operativo',
    'OTHER': 'otros',
  };
  
  return typeMap[type] || 'otros';
}

// Helper function to map local payment methods to API payment methods
function mapPaymentMethodToPaymentMethod(paymentMethod: string): 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER' {
  const paymentMap: Record<string, 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK' | 'OTHER'> = {
    'CASH': 'CASH',
    'CARD': 'CARD',
    'TRANSFER': 'TRANSFER',
    'efectivo': 'CASH',
    'tarjeta': 'CARD',
    'transferencia': 'TRANSFER',
  };
  
  return paymentMap[paymentMethod] || 'CASH';
}

// Helper function to map API payment methods to local payment methods
function mapApiPaymentMethodToLocal(paymentMethod: string): 'CASH' | 'CARD' | 'TRANSFER' {
  const typeMap: Record<string, 'CASH' | 'CARD' | 'TRANSFER'> = {
    'CASH': 'CASH',
    'CARD': 'CARD',
    'TRANSFER': 'TRANSFER',
    'CHECK': 'CASH', // Map check to cash for local compatibility
    'OTHER': 'CASH', // Map other to cash for local compatibility
  };
  
  return typeMap[paymentMethod] || 'CASH';
}
