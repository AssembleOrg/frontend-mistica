/**
 * Simple Sales Hook - KISS MVP
 */

import { useCallback } from 'react';
import { useAppStore } from '@/stores/app.store';
import { Product } from '@/lib/types';

export function useSales() {
  const { 
    cart, 
    salesHistory,
    settings,
    addToCart, 
    removeFromCart, 
    updateCartQuantity, 
    clearCart,
    completeSale,
    getCartTotal,
    getCartItemCount,
    products
  } = useAppStore();

  const addProductToCart = useCallback((productId: string, quantity: number = 1) => {
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error('Producto no encontrado');
    if (product.stock < quantity) throw new Error('Stock insuficiente');
    
    addToCart(product, quantity);
  }, [products, addToCart]);

  const checkout = useCallback((paymentMethod: string, cashReceived?: number) => {
    if (cart.length === 0) throw new Error('El carrito está vacío');
    
    const total = getCartTotal() * (1 + settings.taxRate);
    
    if (paymentMethod === 'efectivo' && cashReceived) {
      if (cashReceived < total) throw new Error('Efectivo insuficiente recibido');
    }
    
    return completeSale(paymentMethod, cashReceived);
  }, [cart, completeSale, getCartTotal, settings.taxRate]);

  const cartTotal = getCartTotal();
  const cartTaxAmount = cartTotal * settings.taxRate;
  const cartGrandTotal = cartTotal + cartTaxAmount;

  const editSale = useCallback((saleId: string, updates: { paymentMethod?: 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto'; notes?: string; customerInfo?: any }) => {
    const { editSale: editSaleInStore } = useAppStore.getState();
    return editSaleInStore(saleId, updates);
  }, []);

  const canEditSale = useCallback((sale: any) => {
    if (!sale) return false;
    
    // Only allow edits within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return sale.createdAt >= twentyFourHoursAgo && sale.status === 'completed';
  }, []);

  return {
    // Cart state
    cart,
    cartTotal,
    cartTaxAmount,
    cartGrandTotal,
    cartItemCount: getCartItemCount(),
    
    // Sales history
    salesHistory,
    
    // Actions
    addProductToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    checkout,
    editSale,
    
    // Utils
    getSaleById: (id: string) => salesHistory.find(s => s.id === id),
    canEditSale
  };
}