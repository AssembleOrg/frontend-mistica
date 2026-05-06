/**
 * Simple Stock Hook - KISS MVP
 */

import { useCallback } from 'react';
import { useAppStore } from '@/stores/app.store';
import { useProducts } from '@/hooks/useProducts';
import { productsService } from '@/services/products.service';
import type { Sale } from '@/services/sales.service';
import type { Product } from '@/lib/types';

export function useStock() {
  const { 
    stockMovements,
    adjustStock,
    getLowStockProducts,
    settings
  } = useAppStore();
  
  // Use same data source as the stock adjustment form
  const { products, addStock, subtractStock } = useProducts();

  const adjustStockQuantity = useCallback(async (productId: string, quantity: number, reason: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Producto no encontrado');
    
    // Save original values before any async operations
    const originalStock = product.stock;
    const expectedNewStock = originalStock + quantity;
    
    if (expectedNewStock < 0) throw new Error('El stock no puede ser negativo');
    
    try {
      console.log('🔧 useStock: Iniciando ajuste de stock:', { productId, quantity, reason, originalStock, expectedNewStock });
      console.log('🔧 useStock: Product encontrado:', { id: product.id, name: product.name, stock: product.stock });
      
      // Update stock via backend API using useProducts methods
      let updatedProduct;
      if (quantity > 0) {
        console.log('🔧 useStock: Agregando stock via addStock');
        updatedProduct = await addStock(productId, quantity);
      } else {
        console.log('🔧 useStock: Restando stock via subtractStock');
        updatedProduct = await subtractStock(productId, Math.abs(quantity));
      }
      
      console.log('🔧 useStock: Stock actualizado en backend, nuevo stock:', updatedProduct?.stock);
      
      // Record the movement in app store for activity tracking
      console.log('🔧 useStock: Registrando movimiento en app store con valores:', { 
        productId, 
        quantity, 
        reason, 
        originalStock, 
        newStock: updatedProduct?.stock || expectedNewStock 
      });
      adjustStock(productId, quantity, reason, originalStock, updatedProduct?.stock || expectedNewStock, product.name);
      
      console.log('🔧 useStock: Ajuste completado exitosamente');
      return updatedProduct;
    } catch (error) {
      console.error('Error al ajustar stock:', error);
      throw new Error(error instanceof Error ? error.message : 'Error al actualizar stock');
    }
  }, [products, addStock, subtractStock, adjustStock]);

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

  const recordSaleMovements = useCallback((
    sale: Sale,
    type: 'salida' | 'entrada',
    currentProducts: Product[]
  ) => {
    const label = type === 'salida'
      ? `Venta #${sale.saleNumber}`
      : `Cancelación venta #${sale.saleNumber}`;

    sale.items.forEach(item => {
      const product = currentProducts.find(p => p.id === item.productId);
      // product.stock is already the POST-backend value.
      // Reconstruct the PRE value: for salida backend subtracted, for entrada backend added.
      const postStock = product?.stock ?? 0;
      const preStock = type === 'salida'
        ? postStock + item.quantity
        : postStock - item.quantity;
      const qty = type === 'salida' ? -item.quantity : item.quantity;
      adjustStock(
        item.productId,
        qty,
        label,
        preStock,
        postStock,
        item.productName,
        sale.id
      );
    });
  }, [adjustStock]);

  return {
    stockMovements,
    getLowStockProducts,
    getOutOfStockProducts,
    getStockMovements,
    adjustStockQuantity,
    recordSaleMovements,
    stockSummary,
    settings
  };
}