/**
 * Simple Sales Hook - KISS MVP
 */

import { useCallback } from 'react';
import { useAppStore } from '@/stores/app.store';
import { Product, PaymentInfo } from '@/lib/types';
import { useSettingsStore } from '@/stores/settings.store';
import { useCustomerStore } from '@/stores/customer.store';

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
  
  const { actions: settingsActions } = useSettingsStore();
  const { chargeBalance, getCustomerById } = useCustomerStore();

  const addProductToCart = useCallback((productId: string, quantity: number = 1) => {
    console.log('🛒 useSales: Buscando producto con ID:', productId);
    console.log('🛒 useSales: Productos disponibles:', products.length);
    console.log('🛒 useSales: Lista de productos:', products.map(p => ({ id: p.id, name: p.name })));
    
    const product = products.find(p => p.id === productId);
    if (!product) {
      console.error('🛒 useSales: Producto NO encontrado con ID:', productId);
      throw new Error('Producto no encontrado');
    }
    
    console.log('🛒 useSales: Producto encontrado:', product.name, 'Stock:', product.stock);
    if (product.stock < quantity) throw new Error('Stock insuficiente');
    
    addToCart(product, quantity);
    console.log('🛒 useSales: Producto agregado al carrito exitosamente');
  }, [products, addToCart]);

  const checkout = useCallback((paymentInfo: PaymentInfo) => {
    if (cart.length === 0) throw new Error('El carrito está vacío');
    
    const subtotal = getCartTotal();
    const taxAmount = subtotal * settings.taxRate;
    const totalBeforeAdjustment = subtotal + taxAmount;
    
    // Apply payment method adjustment (discount/surcharge)
    const paymentAdjustment = settingsActions.calculatePaymentAdjustment(
      totalBeforeAdjustment,
      paymentInfo.method as any
    );
    
    const finalTotal = paymentAdjustment.finalAmount;
    const balanceUsed = paymentInfo.balanceUsed || 0;
    const totalAfterBalance = finalTotal - balanceUsed;
    
    // Handle customer balance transaction
    if (paymentInfo.customerId && balanceUsed > 0) {
      const customer = getCustomerById(paymentInfo.customerId);
      if (!customer) {
        throw new Error('Cliente no encontrado');
      }
      
      if (customer.balance < balanceUsed) {
        throw new Error('Saldo insuficiente del cliente');
      }
    }
    
    if (paymentInfo.method === 'efectivo' && paymentInfo.received) {
      if (paymentInfo.received < totalAfterBalance) {
        throw new Error('Efectivo insuficiente recibido');
      }
    }
    
    // Process the sale first
    const saleData = {
      paymentMethod: paymentInfo.method,
      cashReceived: paymentInfo.received,
      originalTotal: totalBeforeAdjustment,
      adjustmentType: paymentAdjustment.adjustmentType,
      adjustmentAmount: paymentAdjustment.adjustmentAmount,
      adjustmentPercentage: paymentAdjustment.adjustmentPercentage,
      finalTotal: finalTotal,
      reference: paymentInfo.reference,
      // Customer balance information
      customerId: paymentInfo.customerId,
      customerName: paymentInfo.customerName,
      balanceUsed: balanceUsed
    };
    
    const completedSale = completeSale(paymentInfo.method, paymentInfo.received, saleData);
    
    // Charge customer balance after successful sale completion
    if (paymentInfo.customerId && balanceUsed > 0) {
      const success = chargeBalance(
        paymentInfo.customerId,
        balanceUsed,
        `Venta #${completedSale.id}`,
        completedSale.id
      );
      
      if (!success) {
        // This shouldn't happen since we validated above, but just in case
        console.error('Error al cobrar saldo del cliente');
      }
    }
    
    return completedSale;
  }, [cart, completeSale, getCartTotal, settings.taxRate, settingsActions, chargeBalance, getCustomerById]);

  const cartTotal = getCartTotal();
  const cartTaxAmount = cartTotal * settings.taxRate;
  const cartGrandTotal = cartTotal + cartTaxAmount;

  const editSale = useCallback((saleId: string, updates: { paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER'; notes?: string; customerInfo?: any }) => {
    const { editSale: editSaleInStore } = useAppStore.getState();
    return editSaleInStore(saleId, updates);
  }, []);

  const canEditSale = useCallback((sale: any) => {
    if (!sale) return false;
    
    // Only allow edits within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return sale.createdAt >= twentyFourHoursAgo && sale.status === 'completed';
  }, []);

  const getSaleById = useCallback((id: string) => {
    return salesHistory.find(s => s.id === id);
  }, [salesHistory]);

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
    getSaleById,
    canEditSale
  };
}