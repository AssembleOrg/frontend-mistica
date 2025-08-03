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