/**
 * Session Manager Hook
 * 
 * Integrates session management with existing POS workflow
 * Handles multi-cashier operations and prevents conflicts
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useSessionStore, type CashierSession, type Order } from '@/stores/session.store';
import { useAuthStore } from '@/stores/auth.store';
import { useAppStore } from '@/stores/app.store';
import { useCustomerStore } from '@/stores/customer.store';
import { showToast } from '@/lib/toast';
import type { Product, PaymentInfo, Employee } from '@/lib/types';

interface UseSessionManagerOptions {
  autoCreateSession?: boolean;
  sessionTimeout?: number; // Minutes
}

export function useSessionManager(options: UseSessionManagerOptions = {}) {
  const { autoCreateSession = true, sessionTimeout = 60 } = options;
  
  // Store references
  const sessionStore = useSessionStore();
  const { user } = useAuthStore();
  const { completeSale } = useAppStore();
  const { chargeBalance, getCustomerById } = useCustomerStore();

  // Current session state
  const currentSession = sessionStore.getCurrentSession();
  const sessionCart = currentSession ? sessionStore.getSessionCart(currentSession.id) : [];
  const cartTotals = currentSession ? sessionStore.getSessionCartTotal(currentSession.id) : { subtotal: 0, tax: 0, total: 0 };

  console.log('👤 SessionManager: Current session:', currentSession?.id, 'Cart items:', sessionCart.length);

  // Auto-create session for logged-in user
  useEffect(() => {
    if (autoCreateSession && user && !currentSession) {
      console.log('👤 SessionManager: Auto-creando sesión para usuario:', user.name);
      // Convert User to Employee format for session creation
      const employeeFromUser: Employee = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role === 'admin' ? 'gerente' : 'cajero', // Map admin to gerente, others to cajero
        startDate: new Date(), // Default start date for session
        createdAt: new Date(),
        updatedAt: new Date(),
        phone: '',
        address: '',
      };
      sessionStore.createSession(employeeFromUser);
    }
  }, [user, currentSession, autoCreateSession, sessionStore]);

  // Session timeout management
  useEffect(() => {
    if (!currentSession || !sessionTimeout) return;

    const timeoutMs = sessionTimeout * 60 * 1000;
    const timeSinceActivity = Date.now() - new Date(currentSession.lastActivity).getTime();
    
    if (timeSinceActivity > timeoutMs) {
      console.log('⏰ SessionManager: Sesión expirada por inactividad:', currentSession.id);
      showToast.warning('Sesión expirada por inactividad');
      sessionStore.closeSession(currentSession.id);
    }
  }, [currentSession, sessionTimeout, sessionStore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionStore.cleanup();
    };
  }, [sessionStore]);

  // Session management actions
  const createNewSession = useCallback((employee?: Employee) => {
    let targetEmployee = employee;
    
    if (!targetEmployee && user) {
      // Convert User to Employee format
      targetEmployee = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role === 'admin' ? 'gerente' : 'cajero',
        startDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        phone: '',
        address: '',
      };
    }
    
    if (!targetEmployee) {
      throw new Error('No employee specified for session creation');
    }

    console.log('👤 SessionManager: Creando nueva sesión para:', targetEmployee.name);
    return sessionStore.createSession(targetEmployee);
  }, [user, sessionStore]);

  const switchToSession = useCallback((sessionId: string) => {
    console.log('👤 SessionManager: Cambiando a sesión:', sessionId);
    sessionStore.switchSession(sessionId);
  }, [sessionStore]);

  const closeCurrentSession = useCallback(() => {
    if (!currentSession) return;

    if (sessionCart.length > 0) {
      const shouldClose = window.confirm('Hay productos en el carrito. ¿Desea cerrar la sesión de todos modos?');
      if (!shouldClose) return;
    }

    console.log('👤 SessionManager: Cerrando sesión actual:', currentSession.id);
    sessionStore.closeSession(currentSession.id);
    showToast.info('Sesión cerrada');
  }, [currentSession, sessionCart.length, sessionStore]);

  // Cart management (session-aware)
  const addProductToCart = useCallback((product: Product, quantity: number = 1) => {
    if (!currentSession) {
      throw new Error('No hay sesión activa');
    }

    console.log('🛒 SessionManager: Agregando producto al carrito de sesión:', product.name, quantity);
    sessionStore.addToCart(currentSession.id, product, quantity);
    showToast.success(`${product.name} agregado al carrito`);
  }, [currentSession, sessionStore]);

  const removeFromCart = useCallback((productId: string) => {
    if (!currentSession) return;

    console.log('🛒 SessionManager: Removiendo producto del carrito:', productId);
    sessionStore.removeFromCart(currentSession.id, productId);
    showToast.info('Producto removido del carrito');
  }, [currentSession, sessionStore]);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    if (!currentSession) return;

    console.log('🛒 SessionManager: Actualizando cantidad en carrito:', productId, quantity);
    sessionStore.updateCartQuantity(currentSession.id, productId, quantity);
  }, [currentSession, sessionStore]);

  const clearCart = useCallback(() => {
    if (!currentSession) return;

    console.log('🛒 SessionManager: Limpiando carrito de sesión');
    sessionStore.clearCart(currentSession.id);
    showToast.info('Carrito limpiado');
  }, [currentSession, sessionStore]);

  // Customer management (session-aware)
  const assignCustomer = useCallback((customerId: string, customerName: string) => {
    if (!currentSession) return;

    console.log('👤 SessionManager: Asignando cliente a sesión:', customerName);
    sessionStore.assignCustomer(currentSession.id, customerId, customerName);
    showToast.success(`Cliente asignado: ${customerName}`);
  }, [currentSession, sessionStore]);

  const clearCustomer = useCallback(() => {
    if (!currentSession) return;

    console.log('👤 SessionManager: Limpiando cliente de sesión');
    sessionStore.clearCustomer(currentSession.id);
    showToast.info('Cliente removido de la sesión');
  }, [currentSession, sessionStore]);

  // Order management
  const createOrder = useCallback(() => {
    if (!currentSession || sessionCart.length === 0) {
      throw new Error('No se puede crear orden: carrito vacío o sesión inválida');
    }

    console.log('📋 SessionManager: Creando orden desde sesión:', currentSession.id);
    const order = sessionStore.createOrder(currentSession.id);
    showToast.success('Orden creada exitosamente');
    return order;
  }, [currentSession, sessionCart.length, sessionStore]);

  const completeOrder = useCallback(async (orderId: string, paymentInfo: PaymentInfo) => {
    const orders = sessionStore.getActiveOrders();
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
      throw new Error('Orden no encontrada');
    }

    console.log('✅ SessionManager: Completando orden:', orderId);

    try {
      // Handle customer balance if applicable
      if (paymentInfo.customerId && paymentInfo.balanceUsed && paymentInfo.balanceUsed > 0) {
        const customer = getCustomerById(paymentInfo.customerId);
        if (!customer || customer.balance < paymentInfo.balanceUsed) {
          throw new Error('Saldo de cliente insuficiente');
        }

        const success = chargeBalance(
          paymentInfo.customerId,
          paymentInfo.balanceUsed,
          `Orden ${order.id}`,
          order.id
        );

        if (!success) {
          throw new Error('Error procesando saldo del cliente');
        }
      }

      // Complete the order in session store
      sessionStore.completeOrder(orderId, paymentInfo);

      // Integrate with existing sales system for backward compatibility
      const saleData = {
        id: order.id,
        items: order.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          price: item.product.price,
        })),
        total: order.total,
        paymentMethod: paymentInfo.method,
        cashReceived: paymentInfo.received,
        employeeId: order.employeeId,
        customerId: order.customerId,
        customerInfo: order.customerName ? { name: order.customerName } : undefined,
        balanceUsed: paymentInfo.balanceUsed,
        timestamp: new Date(),
      };

      // This will update inventory and create activity logs
      completeSale(paymentInfo.method, paymentInfo.received, saleData);

      showToast.success('Venta completada exitosamente');
      return order;

    } catch (error) {
      console.error('❌ SessionManager: Error completando orden:', error);
      sessionStore.updateOrderStatus(orderId, 'cancelled');
      throw error;
    }
  }, [sessionStore, getCustomerById, chargeBalance, completeSale]);

  const cancelOrder = useCallback((orderId: string, reason?: string) => {
    console.log('❌ SessionManager: Cancelando orden:', orderId, 'razón:', reason);
    sessionStore.cancelOrder(orderId, reason);
    showToast.info('Orden cancelada');
  }, [sessionStore]);

  // Quick checkout (create order and complete in one step)
  const quickCheckout = useCallback(async (paymentInfo: PaymentInfo) => {
    if (!currentSession || sessionCart.length === 0) {
      throw new Error('No se puede procesar venta: carrito vacío');
    }

    console.log('⚡ SessionManager: Quick checkout para sesión:', currentSession.id);

    const order = createOrder();
    await completeOrder(order.id, paymentInfo);
    return order;
  }, [currentSession, sessionCart.length, createOrder, completeOrder]);

  // Get all sessions (for management interface)
  const allSessions = useMemo(() => {
    return Object.values(sessionStore.sessions).filter(session => session.isActive);
  }, [sessionStore.sessions]);

  const activeOrders = useMemo(() => {
    return sessionStore.getActiveOrders();
  }, [sessionStore]);

  const sessionOrders = useMemo(() => {
    return currentSession ? sessionStore.getActiveOrders(currentSession.id) : [];
  }, [currentSession, sessionStore]);

  // Cart calculations
  const cartStats = useMemo(() => ({
    itemCount: sessionCart.reduce((sum, item) => sum + item.quantity, 0),
    uniqueProducts: sessionCart.length,
    ...cartTotals,
  }), [sessionCart, cartTotals]);

  return {
    // Session management
    currentSession,
    allSessions,
    createNewSession,
    switchToSession,
    closeCurrentSession,
    
    // Cart management
    cart: sessionCart,
    cartStats,
    addProductToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    
    // Customer management
    assignCustomer,
    clearCustomer,
    
    // Order management
    activeOrders,
    sessionOrders,
    createOrder,
    completeOrder,
    cancelOrder,
    quickCheckout,
    
    // State flags
    hasActiveSession: !!currentSession,
    hasItemsInCart: sessionCart.length > 0,
    canCreateOrder: !!currentSession && sessionCart.length > 0,
  };
}