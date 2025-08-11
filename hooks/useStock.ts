/**
 * Simple Stock Hook - KISS MVP
 */

import { useCallback } from 'react';
import { useAppStore } from '@/stores/app.store';

export function useStock() {
  const { 
    products,
    stockMovements,
    adjustStock,
    getLowStockProducts,
    settings
  } = useAppStore();

  const adjustStockQuantity = useCallback((productId: string, quantity: number, reason: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Producto no encontrado');
    
    const newStock = product.stock + quantity;
    if (newStock < 0) throw new Error('El stock no puede ser negativo');
    
    adjustStock(productId, quantity, reason);
  }, [products, adjustStock]);

  const getStockMovements = useCallback((productId?: string) => {
    let movements = stockMovements;
    
    if (productId) {
      movements = movements.filter(m => m.productId === productId);
    }
    
    return movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [stockMovements]);

  const getOutOfStockProducts = useCallback(() => {
    return products.filter(p => p.stock === 0 && p.status === 'active');
  }, [products]);

  const stockSummary = {
    totalProducts: products.length,
    lowStock: getLowStockProducts().length,
    outOfStock: getOutOfStockProducts().length,
    totalValue: products.reduce((acc, p) => acc + (p.price * p.stock), 0),
    recentMovements: getStockMovements().slice(0, 10)
  };

  return {
    stockMovements,
    getLowStockProducts,
    getOutOfStockProducts,
    getStockMovements,
    adjustStockQuantity,
    stockSummary,
    settings
  };
}