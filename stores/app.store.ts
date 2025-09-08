/**
 * SIMPLE APP STORE - Todo en uno para MVP
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, Sale, StockMovement, CartItem, Employee, CashTransaction, Expense, FinancialSummary } from '@/lib/types';
// Removed mock imports - now using real API data
import { useActivityStore } from './activity.store';

interface AppState {
  // Products
  products: Product[];
  
  // Sales & Cart
  cart: CartItem[];
  salesHistory: Sale[];
  
  // Stock
  stockMovements: StockMovement[];
  
  // Employees
  employees: Employee[];
  
  // Financial Management
  cashTransactions: CashTransaction[];
  expenses: Expense[];
  
  // Settings
  settings: {
    taxRate: number;
    lowStockThreshold: number;
    storeName: string;
  };
  
  // Product Actions
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  // Employee Actions
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  
  // Financial Actions
  addExpense: (expense: Expense) => void;
  addCashTransaction: (transaction: CashTransaction) => void;
  getFinancialSummary: (date?: Date) => FinancialSummary;
  
  // Cart Actions
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Sales Actions
  completeSale: (paymentMethod: string, cashReceived?: number, saleData?: any) => Sale;
  editSale: (saleId: string, updates: { paymentMethod?: Sale['paymentMethod']; notes?: string; customerInfo?: any }) => boolean;
  
  // Stock Actions
  adjustStock: (productId: string, quantity: number, reason: string, previousStock: number, newStock: number, productName: string) => void;
  
  // Computed
  getCartTotal: () => number;
  getCartItemCount: () => number;
  getLowStockProducts: () => Product[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      products: [],
      cart: [],
      salesHistory: [],
      stockMovements: [],
      employees: [],
      cashTransactions: [],
      expenses: [],
      settings: {
        taxRate: 0.21, // 21% IVA Argentina
        lowStockThreshold: 5,
        storeName: 'MÍSTICA'
      },

      // Product Actions
      addProduct: (product) => {
        set(state => ({
          products: [...state.products, product]
        }));
        
        // Log activity
        useActivityStore.getState().addActivity({
          type: 'cambio_producto',
          description: `Producto agregado: ${product.name}`,
          amount: product.price,
          metadata: { productId: product.id, action: 'create' }
        });
      },

      updateProduct: (id, updates) => {
        const state = get();
        const product = state.products.find(p => p.id === id);
        
        set(state => ({
          products: state.products.map(p => 
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
          )
        }));
        
        // Log activity
        if (product) {
          const activityType = updates.price !== undefined ? 'cambio_precio' : 'cambio_producto';
          const description = updates.price !== undefined 
            ? `Precio actualizado: ${product.name} (${product.price} → ${updates.price})`
            : `Producto actualizado: ${product.name}`;
            
          useActivityStore.getState().addActivity({
            type: activityType,
            description,
            amount: updates.price,
            metadata: { productId: id, updates, action: 'update' }
          });
        }
      },

      deleteProduct: (id) => {
        const state = get();
        const product = state.products.find(p => p.id === id);
        
        set(state => ({
          products: state.products.filter(p => p.id !== id)
        }));
        
        // Log activity
        if (product) {
          useActivityStore.getState().addActivity({
            type: 'cambio_producto',
            description: `Producto eliminado: ${product.name}`,
            metadata: { productId: id, action: 'delete' }
          });
        }
      },

      // Cart Actions
      addToCart: (product, quantity) => {
        const state = get();
        const existingItem = state.cart.find(item => item.productId === product.id);
        const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
        const totalRequestedQuantity = currentQuantityInCart + quantity;
        
        // Stock validation
        if (totalRequestedQuantity > product.stock) {
          throw new Error(`Stock insuficiente. Disponible: ${product.stock}, En carrito: ${currentQuantityInCart}`);
        }
        
        set(state => {
          if (existingItem) {
            return {
              cart: state.cart.map(item =>
                item.productId === product.id
                  ? { ...item, quantity: item.quantity + quantity, subtotal: (item.quantity + quantity) * product.price }
                  : item
              )
            };
          } else {
            const newItem: CartItem = {
              id: crypto.randomUUID(),
              productId: product.id,
              productName: product.name,
              price: product.price,
              quantity,
              subtotal: product.price * quantity
            };
            return { cart: [...state.cart, newItem] };
          }
        });
      },

      removeFromCart: (productId) => set(state => ({
        cart: state.cart.filter(item => item.productId !== productId)
      })),

      updateCartQuantity: (productId, quantity) => {
        const state = get();
        const product = state.products.find(p => p.id === productId);
        
        if (quantity > 0 && product && quantity > product.stock) {
          throw new Error(`Stock insuficiente. Disponible: ${product.stock}`);
        }
        
        set(state => ({
          cart: quantity <= 0 
            ? state.cart.filter(item => item.productId !== productId)
            : state.cart.map(item =>
                item.productId === productId
                  ? { ...item, quantity, subtotal: quantity * item.price }
                  : item
              )
        }));
      },

      clearCart: () => set({ cart: [] }),

      // Sales Actions
      completeSale: (paymentMethod, cashReceived, saleData) => {
        const state = get();
        const subtotal = state.getCartTotal();
        const taxAmount = subtotal * state.settings.taxRate;
        const originalTotal = subtotal + taxAmount;
        
        // Use final total from saleData if available (includes payment adjustments)
        const finalTotal = saleData?.finalTotal || originalTotal;

        const sale: Sale = {
          id: crypto.randomUUID(),
          saleNumber: `SALE-${Date.now()}`,
          items: state.cart.map(item => {
            const product = state.products.find(p => p.id === item.productId)!;
            return {
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.price,
              subtotal: item.subtotal
            };
          }),
          subtotal,
          discount: 0,
          tax: taxAmount,
          total: finalTotal,
          paymentMethod: paymentMethod as 'CASH' | 'CARD' | 'TRANSFER',
          status: 'COMPLETED',
          customerName: saleData?.customerName || 'Cliente',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // POS specific properties
          cashReceived,
          cashChange: cashReceived ? Math.max(0, cashReceived - finalTotal) : undefined,
          cashierId: 'user',
          completedAt: new Date().toISOString(),
          // Payment adjustment properties from saleData
          originalTotal: saleData?.originalTotal,
          finalTotal: saleData?.finalTotal,
          adjustmentAmount: saleData?.adjustmentAmount,
          adjustmentType: saleData?.adjustmentType,
          adjustmentPercentage: saleData?.adjustmentPercentage,
          notes: saleData?.reference,
          // Customer balance properties
          clientId: saleData?.customerId,
          customerEmail: saleData?.customerEmail,
          customerPhone: saleData?.customerPhone,
          balanceUsed: saleData?.balanceUsed
        };

        // Update product stock
        state.cart.forEach(item => {
          const product = state.products.find(p => p.id === item.productId);
          if (product) {
            state.updateProduct(item.productId, { stock: product.stock - item.quantity });
            
            // Add stock movement
            const movement: StockMovement = {
              id: crypto.randomUUID(),
              productId: item.productId,
              type: 'salida',
              quantity: item.quantity,
              reason: `Venta ${sale.id}`,
              userId: 'user',
              createdAt: new Date(),
              previousStock: product.stock,
              newStock: product.stock - item.quantity
            };
            
            set(state => ({
              stockMovements: [...state.stockMovements, movement]
            }));
          }
        });

        set(state => ({
          salesHistory: [...state.salesHistory, sale],
          cart: []
        }));

        // Log sale activity
        useActivityStore.getState().addActivity({
          type: 'ingreso',
          description: `Venta completada - ${state.cart.length} items`,
          amount: finalTotal,
          metadata: { 
            saleId: sale.id, 
            paymentMethod, 
            itemCount: state.cart.length,
            action: 'sale_completed'
          }
        });

        // Generate automatic cash transaction for sales correlation
        const cashTransaction: CashTransaction = {
          id: crypto.randomUUID(),
          type: 'ingreso',
          amount: finalTotal,
          description: `Venta #${sale.id.slice(-8)}`,
          category: 'venta',
          paymentMethod: paymentMethod as any,
          reference: sale.id,
          userId: 'user',
          createdAt: new Date()
        };

        set(state => ({
          cashTransactions: [...state.cashTransactions, cashTransaction]
        }));

        return sale;
      },

      editSale: (saleId, updates) => {
        const state = get();
        const sale = state.salesHistory.find(s => s.id === saleId);
        
        if (!sale) return false;
        
        // Restriction: Only allow edits within 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const saleDate = new Date(sale.createdAt);
        if (saleDate < twentyFourHoursAgo) {
          return false;
        }
        
        // Only allow editing certain fields (not quantities or items)
        const allowedUpdates: Partial<Sale> = {};
        if (updates.paymentMethod) allowedUpdates.paymentMethod = updates.paymentMethod;
        if (updates.notes !== undefined) allowedUpdates.notes = updates.notes;
        
        set(state => ({
          salesHistory: state.salesHistory.map(s =>
            s.id === saleId ? { ...s, ...allowedUpdates, updatedAt: new Date().toISOString() } : s
          )
        }));
        
        // Log edit activity
        useActivityStore.getState().addActivity({
          type: 'cambio_producto',
          description: `Venta editada: ${sale.id.slice(-8)}`,
          metadata: { 
            saleId, 
            updates: allowedUpdates,
            action: 'sale_edited'
          }
        });
        
        return true;
      },

      // Stock Actions
      adjustStock: (productId, quantity, reason, previousStock, newStock, productName) => {
        const movement: StockMovement = {
          id: crypto.randomUUID(),
          productId,
          type: quantity > 0 ? 'entrada' : 'salida',
          quantity: Math.abs(quantity),
          reason,
          userId: 'user',
          createdAt: new Date(),
          previousStock,
          newStock
        };

        set(state => ({
          stockMovements: [...state.stockMovements, movement]
        }));

        // Log stock activity
        useActivityStore.getState().addActivity({
          type: quantity > 0 ? 'ingreso' : 'egreso',
          description: `Ajuste de stock: ${productName} (${quantity > 0 ? '+' : ''}${quantity})`,
          metadata: { 
            productId, 
            movementId: movement.id,
            previousStock,
            newStock,
            reason,
            action: 'stock_adjustment'
          }
        });
      },

      // Employee Actions
      addEmployee: (employee) => {
        set(state => ({
          employees: [...state.employees, employee]
        }));
        
        // Log activity
        useActivityStore.getState().addActivity({
          type: 'cambio_producto',
          description: `Empleado agregado: ${employee.name}`,
          metadata: { employeeId: employee.id, action: 'create' }
        });
      },

      updateEmployee: (id, updates) => {
        const state = get();
        const employee = state.employees.find(e => e.id === id);
        
        set(state => ({
          employees: state.employees.map(e => 
            e.id === id ? { ...e, ...updates, updatedAt: new Date() } : e
          )
        }));
        
        // Log activity
        if (employee) {
          useActivityStore.getState().addActivity({
            type: 'cambio_producto',
            description: `Empleado actualizado: ${employee.name}`,
            metadata: { employeeId: id, updates, action: 'update' }
          });
        }
      },

      deleteEmployee: (id) => {
        const state = get();
        const employee = state.employees.find(e => e.id === id);
        
        set(state => ({
          employees: state.employees.filter(e => e.id !== id)
        }));
        
        // Log activity
        if (employee) {
          useActivityStore.getState().addActivity({
            type: 'cambio_producto',
            description: `Empleado eliminado: ${employee.name}`,
            metadata: { employeeId: id, action: 'delete' }
          });
        }
      },

      // Financial Actions
      addExpense: (expense) => {
        set(state => ({
          expenses: [...state.expenses, expense]
        }));
        
        // Generate corresponding cash transaction
        const cashTransaction: CashTransaction = {
          id: crypto.randomUUID(),
          type: 'egreso',
          amount: expense.amount,
          description: expense.description,
          category: expense.category,
          paymentMethod: expense.paymentMethod,
          reference: expense.id,
          userId: expense.userId,
          createdAt: expense.createdAt
        };
        
        set(state => ({
          cashTransactions: [...state.cashTransactions, cashTransaction]
        }));
        
        // Log activity
        useActivityStore.getState().addActivity({
          type: 'egreso',
          description: `Gasto registrado: ${expense.description}`,
          amount: expense.amount,
          metadata: { 
            expenseId: expense.id, 
            category: expense.category,
            action: 'expense_added'
          }
        });
      },

      addCashTransaction: (transaction) => {
        set(state => ({
          cashTransactions: [...state.cashTransactions, transaction]
        }));
        
        // Log activity
        useActivityStore.getState().addActivity({
          type: transaction.type,
          description: transaction.description,
          amount: transaction.amount,
          metadata: { 
            transactionId: transaction.id,
            category: transaction.category,
            action: 'cash_transaction_added'
          }
        });
      },

      getFinancialSummary: (date = new Date()) => {
        const state = get();
        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        // Filter transactions for the specific date
        const dayTransactions = state.cashTransactions.filter(t => 
          t.createdAt >= startOfDay && t.createdAt < endOfDay
        );
        
        const dayExpenses = state.expenses.filter(e => 
          e.createdAt >= startOfDay && e.createdAt < endOfDay
        );

        const daySales = state.salesHistory.filter(s => {
          const saleDate = new Date(s.createdAt);
          return saleDate >= startOfDay && saleDate < endOfDay;
        });

        // Calculate totals
        const totalIngresos = dayTransactions
          .filter(t => t.type === 'ingreso')
          .reduce((sum, t) => sum + t.amount, 0);
          
        const totalEgresos = dayTransactions
          .filter(t => t.type === 'egreso')
          .reduce((sum, t) => sum + t.amount, 0);

        // Payment method breakdown with proper mapping
        const paymentMethodBreakdown = {
          efectivo: 0,
          tarjeta: 0,
          transferencia: 0,
          mixto: 0
        };

        daySales.forEach(sale => {
          switch (sale.paymentMethod) {
            case 'CASH':
              paymentMethodBreakdown.efectivo += sale.total;
              break;
            case 'CARD':
              paymentMethodBreakdown.tarjeta += sale.total;
              break;
            case 'TRANSFER':
              paymentMethodBreakdown.transferencia += sale.total;
              break;
            default:
              paymentMethodBreakdown.mixto += sale.total;
              break;
          }
        });

        // Top expense categories
        const expenseCategories = new Map();
        dayExpenses.forEach(expense => {
          if (expenseCategories.has(expense.category)) {
            const current = expenseCategories.get(expense.category);
            expenseCategories.set(expense.category, {
              amount: current.amount + expense.amount,
              count: current.count + 1
            });
          } else {
            expenseCategories.set(expense.category, { amount: expense.amount, count: 1 });
          }
        });

        const topExpenseCategories = Array.from(expenseCategories.entries()).map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count
        }));

        return {
          date: targetDate,
          totalIngresos,
          totalEgresos,
          netBalance: totalIngresos - totalEgresos,
          salesCount: daySales.length,
          expensesCount: dayExpenses.length,
          paymentMethodBreakdown,
          topExpenseCategories
        };
      },

      // Computed
      getCartTotal: () => {
        const state = get();
        return state.cart.reduce((total, item) => total + item.subtotal, 0);
      },

      getCartItemCount: () => {
        const state = get();
        return state.cart.reduce((count, item) => count + item.quantity, 0);
      },

      getLowStockProducts: () => {
        const state = get();
        return state.products.filter(p => p.stock <= state.settings.lowStockThreshold);
      }
    }),
    {
      name: 'mistica-app-store',
      onRehydrateStorage: () => (state) => {
        // NOTE: Mock data initialization removed - now using real API data
        // if (state && state.products.length === 0) {
        //   state.products = mockProducts;
        // }
        // if (state && state.salesHistory.length === 0) {
        //   state.salesHistory = mockSales;
        // }
        // if (state && state.employees.length === 0) {
        //   state.employees = mockEmployees;
        // }
      }
    }
  )
);