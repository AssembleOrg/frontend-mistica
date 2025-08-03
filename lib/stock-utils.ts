import { StockMovement, StockAlert, Product } from './types';

/**
 * Calcula el stock actual basado en movimientos
 */
export function calculateCurrentStock(movements: StockMovement[]): number {
  return movements.reduce((total, movement) => {
    switch (movement.type) {
      case 'entrada':
        return total + movement.quantity;
      case 'salida':
        return total - movement.quantity;
      case 'ajuste':
        return movement.newStock; // Los ajustes setean el stock directamente
      default:
        return total;
    }
  }, 0);
}

/**
 * Determina el tipo de alerta basado en stock actual y configuración
 */
export function getAlertType(
  currentStock: number,
  minStock: number
): 'sin_stock' | 'stock_critico' | 'stock_bajo' | null {
  if (currentStock === 0) {
    return 'sin_stock';
  }
  
  if (currentStock <= minStock * 0.5) {
    return 'stock_critico';
  }
  
  if (currentStock <= minStock) {
    return 'stock_bajo';
  }
  
  return null;
}

/**
 * Formatea el tipo de movimiento para mostrar
 */
export function formatMovementType(type: StockMovement['type']): string {
  const typeMap = {
    'entrada': 'Entrada',
    'salida': 'Salida',
    'ajuste': 'Ajuste'
  };
  
  return typeMap[type] || type;
}

/**
 * Formatea el tipo de alerta para mostrar
 */
export function formatAlertType(type: StockAlert['type']): string {
  const typeMap = {
    'stock_bajo': 'Stock Bajo',
    'stock_critico': 'Stock Crítico',
    'sin_stock': 'Sin Stock'
  };
  
  return typeMap[type] || type;
}

/**
 * Obtiene el color para el tipo de alerta
 */
export function getAlertColor(type: StockAlert['type']): {
  color: string;
  bgColor: string;
} {
  const colorMap = {
    'stock_bajo': {
      color: '#f59e0b',
      bgColor: '#fef3c7'
    },
    'stock_critico': {
      color: '#ef4444',
      bgColor: '#fee2e2'
    },
    'sin_stock': {
      color: '#dc2626',
      bgColor: '#fecaca'
    }
  };
  
  return colorMap[type] || { color: '#6b7280', bgColor: '#f3f4f6' };
}

/**
 * Calcula estadísticas de movimientos para un período
 */
export function getMovementStats(
  movements: StockMovement[],
  startDate?: Date,
  endDate?: Date
): {
  totalEntradas: number;
  totalSalidas: number;
  totalAjustes: number;
  cantidadEntradas: number;
  cantidadSalidas: number;
  cantidadAjustes: number;
} {
  const filteredMovements = movements.filter(movement => {
    if (!startDate && !endDate) return true;
    
    const movementDate = movement.createdAt;
    if (startDate && movementDate < startDate) return false;
    if (endDate && movementDate > endDate) return false;
    
    return true;
  });
  
  return filteredMovements.reduce(
    (stats, movement) => {
      switch (movement.type) {
        case 'entrada':
          stats.totalEntradas += movement.quantity;
          stats.cantidadEntradas += 1;
          break;
        case 'salida':
          stats.totalSalidas += movement.quantity;
          stats.cantidadSalidas += 1;
          break;
        case 'ajuste':
          stats.totalAjustes += Math.abs(movement.quantity);
          stats.cantidadAjustes += 1;
          break;
      }
      return stats;
    },
    {
      totalEntradas: 0,
      totalSalidas: 0,
      totalAjustes: 0,
      cantidadEntradas: 0,
      cantidadSalidas: 0,
      cantidadAjustes: 0
    }
  );
}

/**
 * Valida si un ajuste de stock es válido
 */
export function validateStockAdjustment(
  currentStock: number,
  newStock: number,
  reason: string
): { isValid: boolean; error?: string } {
  if (newStock < 0) {
    return {
      isValid: false,
      error: 'El stock no puede ser negativo'
    };
  }
  
  if (!reason.trim()) {
    return {
      isValid: false,
      error: 'Debe proporcionar un motivo para el ajuste'
    };
  }
  
  if (reason.trim().length < 3) {
    return {
      isValid: false,
      error: 'El motivo debe tener al menos 3 caracteres'
    };
  }
  
  return { isValid: true };
}

/**
 * Genera un resumen de stock para reportes
 */
export function generateStockReport(
  products: Product[],
  movements: StockMovement[],
  alerts: StockAlert[]
): {
  totalProducts: number;
  totalStockValue: number;
  lowStockProducts: number;
  criticalStockProducts: number;
  outOfStockProducts: number;
  recentMovements: number;
  activeAlerts: number;
} {
  const activeAlerts = alerts.filter(a => a.isActive);
  const recentMovements = movements.filter(
    m => m.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
  );
  
  return {
    totalProducts: products.length,
    totalStockValue: products.reduce((total, product) => {
      return total + (product.stock * product.costPrice);
    }, 0),
    lowStockProducts: activeAlerts.filter(a => a.type === 'stock_bajo').length,
    criticalStockProducts: activeAlerts.filter(a => a.type === 'stock_critico').length,
    outOfStockProducts: activeAlerts.filter(a => a.type === 'sin_stock').length,
    recentMovements: recentMovements.length,
    activeAlerts: activeAlerts.length
  };
}

/**
 * Ordena movimientos por fecha (más recientes primero)
 */
export function sortMovementsByDate(movements: StockMovement[]): StockMovement[] {
  return [...movements].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Agrupa movimientos por producto
 */
export function groupMovementsByProduct(movements: StockMovement[]): Record<string, StockMovement[]> {
  return movements.reduce((groups, movement) => {
    if (!groups[movement.productId]) {
      groups[movement.productId] = [];
    }
    groups[movement.productId].push(movement);
    return groups;
  }, {} as Record<string, StockMovement[]>);
}