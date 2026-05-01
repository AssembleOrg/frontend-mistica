// Product related types
export type ProductCategory = 'organicos' | 'aromaticos' | 'wellness';

export interface Product {
  id: string;
  name: string;
  barcode: string; // Código de barras único generado por la app
  category: ProductCategory;
  price: number; // Precio de venta
  costPrice: number; // Precio de costo
  stock: number;
  unitOfMeasure: 'litro' | 'gramo' | 'unidad';
  image?: string;
  description: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  createdAt: Date;
  updatedAt: Date;
  profitMargin?: number;
}

// Stock Management Types
export interface StockMovement {
  id: string;
  productId: string;
  type: 'entrada' | 'salida' | 'ajuste';
  quantity: number;
  reason: string;
  reference?: string; // Referencia a venta, compra, etc.
  userId: string; // Usuario que realizó el movimiento
  createdAt: Date;
  previousStock: number;
  newStock: number;
}

export interface StockAlert {
  id: string;
  productId: string;
  type: 'stock_bajo' | 'stock_critico' | 'sin_stock';
  threshold: number;
  currentStock: number;
  isActive: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  oldQuantity: number;
  newQuantity: number;
  difference: number;
  reason: string;
  notes?: string;
  userId: string;
  createdAt: Date;
}

export interface StockSettings {
  productId: string;
  minStock: number;
  maxStock?: number;
  reorderPoint: number;
  alertEnabled: boolean;
}

// Configuration types for product categories and statuses
export interface CategoryConfig {
  [key: string]: {
    label: string;
    color: string;
    bgColor: string;
  };
}

export interface StatusConfig {
  [key: string]: {
    label: string;
    color: string;
    bgColor: string;
  };
}

// Sales/POS System Types
export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  // Optional properties for enhanced functionality
  id?: string;
  product?: Product;
  discountAmount?: number;
  discountPercentage?: number;
  notes?: string;
}

export type PaymentMethodCode = 'CASH' | 'CARD' | 'TRANSFER';

export interface SalePayment {
  method: PaymentMethodCode;
  amount: number;
  /** Sólo CASH: lo que entregó el cliente físicamente (≥ amount). */
  receivedAmount?: number;
  /** Sólo CASH: vuelto entregado (= receivedAmount - amount). */
  changeGiven?: number;
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
  payments: SalePayment[];
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  cashierId?: string;
  completedAt?: string;
  cancelledAt?: string;
  // Customer balance properties
  balanceUsed?: number;
}

export interface POSSettings {
  taxRate: number;
  allowNegativeStock: boolean;
  requireCustomerInfo: boolean;
  autoGenerateReceipt: boolean;
  defaultPaymentMethod: PaymentMethodCode;
  lowStockWarning: boolean;
  maxItemsPerSale?: number;
}

export interface StockValidation {
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableStock: number;
  isValid: boolean;
  message?: string;
}

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  totalItems: number;
  averageTicket: number;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
  }>;
  salesByPaymentMethod: Record<PaymentMethodCode, number>;
  salesByHour: Record<number, number>;
}

// Error types for POS system
export class InsufficientStockError extends Error {
  constructor(productName: string, requested: number, available: number) {
    super(
      `Stock insuficiente para ${productName}. Solicitado: ${requested}, Disponible: ${available}`
    );
    this.name = 'InsufficientStockError';
  }
}

export class ProductNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Producto no encontrado: ${identifier}`);
    this.name = 'ProductNotFoundError';
  }
}

export class SaleValidationError extends Error {
  constructor(message: string, public validations: StockValidation[]) {
    super(message);
    this.name = 'SaleValidationError';
  }
}

// Cart and Sales Types (moved from architecture types)
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  discounts?: Array<{
    amount?: number;
    percentage?: number;
    description?: string;
  }>;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

export interface PaymentInfo {
  method: string;
  amount: number;
  received?: number;
  change?: number;
  reference?: string;
  cashReceived?: number;
  cardReference?: string;
  transferReference?: string;
  // Customer balance information
  customerId?: string;
  customerName?: string;
  balanceUsed?: number;
}

// Store state interfaces
export interface SalesHistoryState {
  sales: Sale[];
  isLoading: boolean;
  error: string | null;
}

export interface POSSettingsState {
  settings: POSSettings;
  isLoading: boolean;
}

// User types (aligned with backend API)
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user'; // Backend uses 'admin' | 'user', UI can map roles
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Employee Management Types
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'cajero' | 'gerente' | 'mozo';
  phone?: string;
  address?: string;
  startDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeCreationData {
  name: string;
  email: string;
  role: Employee['role'];
  phone?: string;
  address?: string;
  startDate: Date;
}

// Customer/Client Management Types
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string; // CUIT/CUIL
  notes?: string;
  preferredPaymentMethod?: PaymentMethodCode;
  totalPurchases?: number;
  purchaseCount?: number;
  lastPurchase?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Financial Summary Types
export interface CashTransaction {
  id: string;
  type: 'ingreso' | 'egreso';
  amount: number;
  description: string;
  category: string;
  paymentMethod: PaymentMethodCode;
  reference?: string; // Reference to sale ID, expense ID, etc.
  userId: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  category: 'operativo' | 'compras' | 'servicios' | 'otros';
  paymentMethod: PaymentMethodCode;
  receipt?: string; // Receipt/invoice reference
  notes?: string;
  userId: string;
  createdAt: Date;
}

export interface FinancialSummary {
  date: Date;
  totalIngresos: number;
  totalEgresos: number;
  netBalance: number;
  salesCount: number;
  expensesCount: number;
  paymentMethodBreakdown: {
    efectivo: number;
    tarjeta: number;
    transferencia: number;
    mixto: number;
  };
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
}

export interface DailyClosing {
  id: string;
  date: Date;
  openingCash: number;
  totalSales: number;
  totalExpenses: number;
  expectedCash: number;
  actualCash: number;
  discrepancy: number;
  notes?: string;
  closedBy: string;
  createdAt: Date;
}

// Invoice types for future A/B/C implementation
export interface Invoice {
  id: string;
  saleId: string;
  type: 'A' | 'B' | 'C';
  number: string;
  customerInfo: {
    name: string;
    taxId?: string; // CUIT/CUIL for type A
    address?: string;
  };
  items: SaleItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  status: 'draft' | 'issued' | 'cancelled';
  issuedAt?: Date;
  afipCae?: string; // CAE from AFIP
  dueDate?: Date;
}
