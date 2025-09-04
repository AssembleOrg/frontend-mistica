/**
 * Session Store - Multi-Cashier Session Management
 * 
 * Handles individual cashier sessions to prevent conflicts and enable
 * multiple concurrent POS operations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Employee, Product, PaymentInfo } from '@/lib/types';

// Session-specific cart item
interface SessionCartItem {
  product: Product;
  quantity: number;
  addedAt: Date;
  reservationId?: string;
}

// Individual cashier session
export interface CashierSession {
  id: string;
  employeeId: string;
  employee: Employee;
  cart: SessionCartItem[];
  pendingOrders: string[]; // Order IDs
  customerId?: string;
  customerName?: string;
  startedAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

// Order states for proper workflow management
export type OrderStatus = 'draft' | 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';

export interface Order {
  id: string;
  sessionId: string;
  employeeId: string;
  customerId?: string;
  customerName?: string;
  items: SessionCartItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentInfo?: PaymentInfo;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  notes?: string;
}

// Store state interface
interface SessionState {
  // Data
  sessions: Record<string, CashierSession>;
  orders: Record<string, Order>;
  currentSessionId: string | null;
  
  // Actions
  createSession: (employee: Employee) => CashierSession;
  switchSession: (sessionId: string) => void;
  closeSession: (sessionId: string) => void;
  
  // Cart Management (session-specific)
  addToCart: (sessionId: string, product: Product, quantity: number) => void;
  removeFromCart: (sessionId: string, productId: string) => void;
  updateCartQuantity: (sessionId: string, productId: string, quantity: number) => void;
  clearCart: (sessionId: string) => void;
  
  // Order Management
  createOrder: (sessionId: string) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  completeOrder: (orderId: string, paymentInfo: PaymentInfo) => void;
  cancelOrder: (orderId: string, reason?: string) => void;
  
  // Customer Assignment
  assignCustomer: (sessionId: string, customerId: string, customerName: string) => void;
  clearCustomer: (sessionId: string) => void;
  
  // Utilities
  getCurrentSession: () => CashierSession | null;
  getSessionCart: (sessionId: string) => SessionCartItem[];
  getSessionCartTotal: (sessionId: string) => { subtotal: number; tax: number; total: number };
  getActiveOrders: (sessionId?: string) => Order[];
  cleanup: () => void; // Remove inactive sessions
}

// Initial state
const initialState = {
  sessions: {},
  orders: {},
  currentSessionId: null,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      ...initialState,

      createSession: (employee) => {
        const sessionId = `session_${employee.id}_${Date.now()}`;
        const newSession: CashierSession = {
          id: sessionId,
          employeeId: employee.id,
          employee,
          cart: [],
          pendingOrders: [],
          startedAt: new Date(),
          lastActivity: new Date(),
          isActive: true,
        };

        console.log('👤 Session: Creando nueva sesión:', sessionId, 'para empleado:', employee.name);

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: newSession,
          },
          currentSessionId: sessionId,
        }));

        return newSession;
      },

      switchSession: (sessionId) => {
        const { sessions } = get();
        const session = sessions[sessionId];
        
        if (!session || !session.isActive) {
          console.warn('👤 Session: Intento de cambiar a sesión inactiva:', sessionId);
          return;
        }

        console.log('👤 Session: Cambiando a sesión:', sessionId);
        
        set((state) => ({
          currentSessionId: sessionId,
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              lastActivity: new Date(),
            },
          },
        }));
      },

      closeSession: (sessionId) => {
        const { sessions, orders } = get();
        const session = sessions[sessionId];
        
        if (!session) return;

        console.log('👤 Session: Cerrando sesión:', sessionId);

        // Cancel any pending orders
        const sessionOrders = Object.values(orders).filter(
          order => order.sessionId === sessionId && order.status === 'pending'
        );
        
        sessionOrders.forEach(order => {
          get().cancelOrder(order.id, 'Session closed');
        });

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              isActive: false,
              cart: [], // Clear cart on close
            },
          },
          currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
        }));
      },

      addToCart: (sessionId, product, quantity) => {
        const { sessions } = get();
        const session = sessions[sessionId];
        
        if (!session || !session.isActive) {
          throw new Error('Session not found or inactive');
        }

        if (product.stock < quantity) {
          throw new Error('Stock insuficiente');
        }

        console.log('🛒 Session Cart: Agregando producto:', product.name, 'cantidad:', quantity, 'sesión:', sessionId);

        const existingItemIndex = session.cart.findIndex(item => item.product.id === product.id);
        let updatedCart: SessionCartItem[];

        if (existingItemIndex >= 0) {
          const existingItem = session.cart[existingItemIndex];
          const newQuantity = existingItem.quantity + quantity;
          
          if (newQuantity > product.stock) {
            throw new Error('Stock insuficiente para la cantidad total');
          }

          updatedCart = [...session.cart];
          updatedCart[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity,
          };
        } else {
          const newItem: SessionCartItem = {
            product,
            quantity,
            addedAt: new Date(),
          };
          updatedCart = [...session.cart, newItem];
        }

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              cart: updatedCart,
              lastActivity: new Date(),
            },
          },
        }));
      },

      removeFromCart: (sessionId, productId) => {
        const { sessions } = get();
        const session = sessions[sessionId];
        
        if (!session) return;

        console.log('🛒 Session Cart: Removiendo producto:', productId, 'de sesión:', sessionId);

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              cart: session.cart.filter(item => item.product.id !== productId),
              lastActivity: new Date(),
            },
          },
        }));
      },

      updateCartQuantity: (sessionId, productId, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(sessionId, productId);
          return;
        }

        const { sessions } = get();
        const session = sessions[sessionId];
        
        if (!session) return;

        const itemIndex = session.cart.findIndex(item => item.product.id === productId);
        if (itemIndex === -1) return;

        const item = session.cart[itemIndex];
        if (quantity > item.product.stock) {
          throw new Error('Stock insuficiente');
        }

        console.log('🛒 Session Cart: Actualizando cantidad:', productId, 'nueva cantidad:', quantity, 'sesión:', sessionId);

        const updatedCart = [...session.cart];
        updatedCart[itemIndex] = {
          ...item,
          quantity,
        };

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              cart: updatedCart,
              lastActivity: new Date(),
            },
          },
        }));
      },

      clearCart: (sessionId) => {
        const { sessions } = get();
        const session = sessions[sessionId];
        
        if (!session) return;

        console.log('🛒 Session Cart: Limpiando carrito de sesión:', sessionId);

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              cart: [],
              lastActivity: new Date(),
            },
          },
        }));
      },

      createOrder: (sessionId) => {
        const { sessions } = get();
        const session = sessions[sessionId];
        
        if (!session || session.cart.length === 0) {
          throw new Error('Cannot create order: empty cart or invalid session');
        }

        const orderId = `order_${sessionId}_${Date.now()}`;
        const totals = get().getSessionCartTotal(sessionId);
        
        const newOrder: Order = {
          id: orderId,
          sessionId,
          employeeId: session.employeeId,
          customerId: session.customerId,
          customerName: session.customerName,
          items: [...session.cart],
          subtotal: totals.subtotal,
          tax: totals.tax,
          total: totals.total,
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        console.log('📋 Session Order: Creando orden:', orderId, 'para sesión:', sessionId);

        set((state) => ({
          orders: {
            ...state.orders,
            [orderId]: newOrder,
          },
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              pendingOrders: [...session.pendingOrders, orderId],
              cart: [], // Clear cart after creating order
              lastActivity: new Date(),
            },
          },
        }));

        return newOrder;
      },

      updateOrderStatus: (orderId, status) => {
        const { orders } = get();
        const order = orders[orderId];
        
        if (!order) return;

        console.log('📋 Session Order: Actualizando status:', orderId, 'nuevo status:', status);

        set((state) => ({
          orders: {
            ...state.orders,
            [orderId]: {
              ...order,
              status,
              updatedAt: new Date(),
              ...(status === 'completed' && { completedAt: new Date() }),
            },
          },
        }));
      },

      completeOrder: (orderId, paymentInfo) => {
        const { orders } = get();
        const order = orders[orderId];
        
        if (!order) throw new Error('Order not found');

        console.log('✅ Session Order: Completando orden:', orderId);

        set((state) => ({
          orders: {
            ...state.orders,
            [orderId]: {
              ...order,
              status: 'completed',
              paymentInfo,
              updatedAt: new Date(),
              completedAt: new Date(),
            },
          },
        }));
      },

      cancelOrder: (orderId, reason) => {
        const { orders } = get();
        const order = orders[orderId];
        
        if (!order) return;

        console.log('❌ Session Order: Cancelando orden:', orderId, 'razón:', reason);

        set((state) => ({
          orders: {
            ...state.orders,
            [orderId]: {
              ...order,
              status: 'cancelled',
              notes: reason,
              updatedAt: new Date(),
            },
          },
        }));
      },

      assignCustomer: (sessionId, customerId, customerName) => {
        const { sessions } = get();
        const session = sessions[sessionId];
        
        if (!session) return;

        console.log('👤 Session Customer: Asignando cliente:', customerName, 'a sesión:', sessionId);

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              customerId,
              customerName,
              lastActivity: new Date(),
            },
          },
        }));
      },

      clearCustomer: (sessionId) => {
        const { sessions } = get();
        const session = sessions[sessionId];
        
        if (!session) return;

        console.log('👤 Session Customer: Limpiando cliente de sesión:', sessionId);

        set((state) => ({
          sessions: {
            ...state.sessions,
            [sessionId]: {
              ...session,
              customerId: undefined,
              customerName: undefined,
              lastActivity: new Date(),
            },
          },
        }));
      },

      getCurrentSession: () => {
        const { currentSessionId, sessions } = get();
        return currentSessionId ? sessions[currentSessionId] : null;
      },

      getSessionCart: (sessionId) => {
        const { sessions } = get();
        const session = sessions[sessionId];
        return session ? session.cart : [];
      },

      getSessionCartTotal: (sessionId) => {
        const cart = get().getSessionCart(sessionId);
        const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const tax = subtotal * 0.21; // 21% IVA
        const total = subtotal + tax;
        
        return { subtotal, tax, total };
      },

      getActiveOrders: (sessionId) => {
        const { orders } = get();
        return Object.values(orders).filter(order => {
          const matchesSession = sessionId ? order.sessionId === sessionId : true;
          return matchesSession && ['draft', 'pending', 'processing'].includes(order.status);
        });
      },

      cleanup: () => {
        const { sessions } = get();
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

        console.log('🧹 Session: Limpiando sesiones inactivas');

        const activeSessions = Object.fromEntries(
          Object.entries(sessions).filter(([_, session]) => 
            session.isActive && session.lastActivity > cutoffTime
          )
        );

        set({ sessions: activeSessions });
      },
    }),
    {
      name: 'mistica-sessions-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        orders: state.orders,
        currentSessionId: state.currentSessionId,
      }),
      skipHydration: true, // Prevent SSR hydration issues
    }
  )
);

// Helper functions
export const useCurrentSession = () => {
  return useSessionStore((state) => state.getCurrentSession());
};

export const useSessionCart = () => {
  const currentSession = useCurrentSession();
  return useSessionStore((state) => 
    currentSession ? state.getSessionCart(currentSession.id) : []
  );
};

export const useSessionCartTotal = () => {
  const currentSession = useCurrentSession();
  return useSessionStore((state) => 
    currentSession ? state.getSessionCartTotal(currentSession.id) : { subtotal: 0, tax: 0, total: 0 }
  );
};