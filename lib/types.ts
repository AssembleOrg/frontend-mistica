// Product related types
export interface Product {
  id: string;
  name: string;
  barcode: string; // Código de barras único generado por la app
  category: 'organicos' | 'aromaticos' | 'wellness';
  price: number; // Precio de venta
  costPrice: number; // Precio de costo
  stock: number;
  unitOfMeasure: 'litro' | 'gramo';
  image: string;
  description: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  createdAt: Date;
  updatedAt: Date;
  // Campos calculados
  profitMargin?: number; // (price - costPrice) / costPrice * 100
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
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountAmount?: number;
  discountPercentage?: number;
  notes?: string;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  total: number;
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
  cashReceived?: number;
  cashChange?: number;
  customerId?: string;
  customerInfo?: {
    name: string;
    email?: string;
    phone?: string;
  };
  notes?: string;
  status: 'draft' | 'completed' | 'cancelled' | 'refunded';
  cashierId: string;
  createdAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface POSSettings {
  taxRate: number;
  allowNegativeStock: boolean;
  requireCustomerInfo: boolean;
  autoGenerateReceipt: boolean;
  defaultPaymentMethod: Sale['paymentMethod'];
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
  salesByPaymentMethod: Record<Sale['paymentMethod'], number>;
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

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'cashier';
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
