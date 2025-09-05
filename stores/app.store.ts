/**
 * SIMPLE APP STORE - Todo en uno para MVP
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Product,
  Sale,
  StockMovement,
  CartItem,
  Employee,
  CashTransaction,
  Expense,
  FinancialSummary,
  PaymentInfo,
} from '@/lib/types';
import { mockProducts, mockSales, mockEmployees } from '@/lib/mock-data';
import { useActivityStore } from './activity.store';

interface AppState {
  // Products
  products: Product[];
  setProducts: (products: Product[]) => void;

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
  completeSale: (
    paymentMethod: Sale['paymentMethod'],
    cashReceived?: number,
    saleData?: {
      originalTotal?: number;
      finalTotal?: number;
      adjustmentAmount?: number;
      adjustmentType?: 'descuento' | 'recargo' | 'ninguno';
      adjustmentPercentage?: number;
      reference?: string;
      customerId?: string;
      customerName?: string;
      balanceUsed?: number;
    }
  ) => Sale;
  editSale: (
    saleId: string,
    updates: {
      paymentMethod?: Sale['paymentMethod'];
      notes?: string;
      customerInfo?: Partial<Sale['customerInfo']>;
      items?: Array<{
        productId: string;
        unitPrice: number;
        quantity: number;
        discountPercentage?: number;
      }>;
    }
  ) => boolean;
  saveDraftFromCart: (
    notes?: string,
    customerInfo?: Partial<Sale['customerInfo']>,
    saleData?: {
      originalTotal?: number;
      finalTotal?: number;
      adjustmentAmount?: number;
      adjustmentType?: 'descuento' | 'recargo' | 'ninguno';
      adjustmentPercentage?: number;
      reference?: string;
      customerId?: string;
      customerName?: string;
      balanceUsed?: number;
    }
  ) => Sale;
  loadDraftToCart: (saleId: string) => boolean;
  finalizeDraft: (
    saleId: string,
    paymentInfo: PaymentInfo,
    saleData?: {
      finalTotal?: number;
      adjustmentAmount?: number;
      adjustmentType?: 'descuento' | 'recargo' | 'ninguno';
      adjustmentPercentage?: number;
    }
  ) => Sale;

  // Stock Actions
  adjustStock: (
    productId: string,
    quantity: number,
    reason: string,
    previousStock: number,
    newStock: number,
    productName: string
  ) => void;

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
        storeName: 'MÍSTICA',
      },

      // Product Actions
      setProducts: (products) => {
        set({ products });
      },

      addProduct: (product) => {
        set((state) => ({
          products: [...state.products, product],
        }));

        // Log activity
        useActivityStore.getState().addActivity({
          type: 'cambio_producto',
          description: `Producto agregado: ${product.name}`,
          amount: product.price,
          metadata: { productId: product.id, action: 'create' },
        });
      },

      updateProduct: (id, updates) => {
        const state = get();
        const product = state.products.find((p) => p.id === id);

        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
          ),
        }));

        // Log activity
        if (product) {
          const activityType =
            updates.price !== undefined ? 'cambio_precio' : 'cambio_producto';
          const description =
            updates.price !== undefined
              ? `Precio actualizado: ${product.name} (${product.price} â†’ ${updates.price})`
              : `Producto actualizado: ${product.name}`;

          useActivityStore.getState().addActivity({
            type: activityType,
            description,
            amount: updates.price,
            metadata: { productId: id, updates, action: 'update' },
          });
        }
      },

      deleteProduct: (id) => {
        const state = get();
        const product = state.products.find((p) => p.id === id);

        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        }));

        // Log activity
        if (product) {
          useActivityStore.getState().addActivity({
            type: 'cambio_producto',
            description: `Producto eliminado: ${product.name}`,
            metadata: { productId: id, action: 'delete' },
          });
        }
      },

      // Cart Actions
      addToCart: (product, quantity) => {
        const state = get();
        const existingItem = state.cart.find(
          (item) => item.productId === product.id
        );
        const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
        const totalRequestedQuantity = currentQuantityInCart + quantity;

        // Stock validation
        if (totalRequestedQuantity > product.stock) {
          throw new Error(
            `Stock insuficiente. Disponible: ${product.stock}, En carrito: ${currentQuantityInCart}`
          );
        }

        set((state) => {
          if (existingItem) {
            return {
              cart: state.cart.map((item) =>
                item.productId === product.id
                  ? {
                      ...item,
                      quantity: item.quantity + quantity,
                      subtotal: (item.quantity + quantity) * product.price,
                    }
                  : item
              ),
            };
          } else {
            const newItem: CartItem = {
              id: crypto.randomUUID(),
              productId: product.id,
              productName: product.name,
              price: product.price,
              quantity,
              subtotal: product.price * quantity,
            };
            return { cart: [...state.cart, newItem] };
          }
        });
      },

      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.productId !== productId),
        })),

      updateCartQuantity: (productId, quantity) => {
        const state = get();
        const product = state.products.find((p) => p.id === productId);

        if (quantity > 0 && product && quantity > product.stock) {
          throw new Error(`Stock insuficiente. Disponible: ${product.stock}`);
        }

        set((state) => ({
          cart:
            quantity <= 0
              ? state.cart.filter((item) => item.productId !== productId)
              : state.cart.map((item) =>
                  item.productId === productId
                    ? { ...item, quantity, subtotal: quantity * item.price }
                    : item
                ),
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
          items: state.cart.map((item) => {
            const product = state.products.find(
              (p) => p.id === item.productId
            )!;
            return {
              id: crypto.randomUUID(),
              productId: item.productId,
              product: product,
              quantity: item.quantity,
              unitPrice: item.price,
              subtotal: item.subtotal,
            };
          }),
          subtotal,
          discountTotal: 0,
          taxAmount,
          total: finalTotal,
          paymentMethod: paymentMethod,
          cashReceived,
          cashChange: cashReceived
            ? Math.max(0, cashReceived - finalTotal)
            : undefined,
          status: 'completed',
          cashierId: 'user',
          createdAt: new Date(),
          completedAt: new Date(),
          // Payment adjustment properties from saleData
          originalTotal: saleData?.originalTotal,
          finalTotal: saleData?.finalTotal,
          adjustmentAmount: saleData?.adjustmentAmount,
          adjustmentType: saleData?.adjustmentType,
          adjustmentPercentage: saleData?.adjustmentPercentage,
          notes: saleData?.reference,
          // Customer balance properties
          customerId: saleData?.customerId,
          customerInfo: saleData?.customerId
            ? {
                name: saleData.customerName || 'Cliente',
              }
            : undefined,
          balanceUsed: saleData?.balanceUsed,
        };

        // Update product stock
        state.cart.forEach((item) => {
          const product = state.products.find((p) => p.id === item.productId);
          if (product) {
            state.updateProduct(item.productId, {
              stock: product.stock - item.quantity,
            });

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
              newStock: product.stock - item.quantity,
            };

            set((state) => ({
              stockMovements: [...state.stockMovements, movement],
            }));
          }
        });

        set((state) => ({
          salesHistory: [...state.salesHistory, sale],
          cart: [],
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
            action: 'sale_completed',
          },
        });

        // Generate automatic cash transaction for sales correlation
        const cashTransaction: CashTransaction = {
          id: crypto.randomUUID(),
          type: 'ingreso',
          amount: finalTotal,
          description: `Venta #${sale.id.slice(-8)}`,
          category: 'venta',
          paymentMethod: paymentMethod,
          reference: sale.id,
          userId: 'user',
          createdAt: new Date(),
        };

        set((state) => ({
          cashTransactions: [...state.cashTransactions, cashTransaction],
        }));

        return sale;
      },

      editSale: (saleId, updates) => {
        const state = get();
        const sale = state.salesHistory.find((s) => s.id === saleId);

        if (!sale) return false;

        // Sin restricción temporal para ventas completadas

        const allowedUpdates: Partial<Sale> = {};
        if (updates.paymentMethod)
          allowedUpdates.paymentMethod = updates.paymentMethod;
        if (updates.notes !== undefined) allowedUpdates.notes = updates.notes;
        if (updates.customerInfo) {
          allowedUpdates.customerInfo = {
            name:
              updates.customerInfo.name ?? sale.customerInfo?.name ?? 'Cliente',
            email: updates.customerInfo.email ?? sale.customerInfo?.email,
            phone: updates.customerInfo.phone ?? sale.customerInfo?.phone,
          };
        }

        // Allow updating items when sale is open (draft)
        if (sale.status === 'draft' && updates.items) {
          const newItems = updates.items.map((it) => {
            const product = state.products.find((p) => p.id === it.productId)!;
            const subtotal = it.unitPrice * it.quantity;
            return {
              id: crypto.randomUUID(),
              productId: it.productId,
              product,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discountPercentage: it.discountPercentage,
              discountAmount: it.discountPercentage
                ? (it.unitPrice * it.quantity * it.discountPercentage) / 100
                : 0,
              subtotal,
            };
          });
          const subtotal = newItems.reduce((sum, i) => sum + i.subtotal, 0);
          const discountTotal = newItems.reduce(
            (sum, i) => sum + (i.discountAmount || 0),
            0
          );
          const adjustedSubtotal = subtotal - discountTotal;
          const taxAmount = adjustedSubtotal * state.settings.taxRate;
          const total = adjustedSubtotal + taxAmount;
          allowedUpdates.items = newItems;
          allowedUpdates.subtotal = subtotal;
          allowedUpdates.discountTotal = discountTotal;
          allowedUpdates.taxAmount = taxAmount;
          allowedUpdates.total = total;
        }

        set((state) => ({
          salesHistory: state.salesHistory.map((s) =>
            s.id === saleId
              ? { ...s, ...allowedUpdates, updatedAt: new Date() }
              : s
          ),
        }));

        // Log edit activity
        useActivityStore.getState().addActivity({
          type: 'cambio_producto',
          description: `Venta editada: ${sale.id.slice(-8)}`,
          metadata: {
            saleId,
            updates: allowedUpdates,
            action: 'sale_edited',
          },
        });

        return true;
      },

      // Save current cart as a draft (open order)
      saveDraftFromCart: (notes, customerInfo, saleData) => {
        const state = get();
        const subtotal = state.getCartTotal();
        const taxAmount = subtotal * state.settings.taxRate;
        const total = subtotal + taxAmount;

        const draft: Sale = {
          id: crypto.randomUUID(),
          items: state.cart.map((item) => {
            const product = state.products.find(
              (p) => p.id === item.productId
            )!;
            return {
              id: crypto.randomUUID(),
              productId: item.productId,
              product,
              quantity: item.quantity,
              unitPrice: item.price,
              subtotal: item.subtotal,
            };
          }),
          subtotal,
          discountTotal: 0,
          taxAmount,
          total: saleData?.finalTotal ?? total,
          paymentMethod: 'efectivo',
          status: 'draft',
          cashierId: 'user',
          createdAt: new Date(),
          notes: saleData?.reference ?? notes,
          customerInfo:
            customerInfo && customerInfo.name
              ? {
                  name: customerInfo.name,
                  email: customerInfo.email,
                  phone: customerInfo.phone,
                }
              : undefined,
          originalTotal: saleData?.originalTotal,
          finalTotal: saleData?.finalTotal,
          adjustmentAmount: saleData?.adjustmentAmount,
          adjustmentType: saleData?.adjustmentType,
          adjustmentPercentage: saleData?.adjustmentPercentage,
          customerId: saleData?.customerId,
          balanceUsed: saleData?.balanceUsed,
        };

        set((state) => ({
          salesHistory: [draft, ...state.salesHistory],
          cart: [],
        }));

        // Log activity (no stock change on draft)
        useActivityStore.getState().addActivity({
          type: 'ingreso',
          description: `Comanda guardada (borrador) - ${draft.items.length} items`,
          amount: total,
          metadata: { saleId: draft.id, action: 'order_draft_saved' },
        });

        return draft;
      },

      // Load a draft into the current cart for editing
      loadDraftToCart: (saleId) => {
        const state = get();
        const draft = state.salesHistory.find(
          (s) => s.id === saleId && s.status === 'draft'
        );
        if (!draft) return false;

        set({
          cart: draft.items.map((it) => ({
            id: crypto.randomUUID(),
            productId: it.productId,
            productName: it.product.name,
            price: it.unitPrice,
            quantity: it.quantity,
            subtotal: it.subtotal,
          })),
        });
        return true;
      },

      // Finalize a draft: update stock, mark as completed, add cash transaction
      finalizeDraft: (saleId, paymentInfo, saleData) => {
        const state = get();
        const draft = state.salesHistory.find(
          (s) => s.id === saleId && s.status === 'draft'
        );
        if (!draft) {
          throw new Error('Comanda no encontrada o ya cerrada');
        }

        const originalTotal = draft.subtotal + draft.taxAmount;
        const finalTotal = saleData?.finalTotal || originalTotal;

        // Update product stock and movements
        draft.items.forEach((item) => {
          const product = state.products.find((p) => p.id === item.productId);
          if (product) {
            state.updateProduct(item.productId, {
              stock: product.stock - item.quantity,
            });
            const movement: StockMovement = {
              id: crypto.randomUUID(),
              productId: item.productId,
              type: 'salida',
              quantity: item.quantity,
              reason: `Venta ${saleId}`,
              userId: 'user',
              createdAt: new Date(),
              previousStock: product.stock,
              newStock: product.stock - item.quantity,
            };
            set((curr) => ({
              stockMovements: [...curr.stockMovements, movement],
            }));
          }
        });

        // Update sale to completed
        const updated: Sale = {
          ...draft,
          paymentMethod: paymentInfo.method,
          cashReceived: paymentInfo.received,
          cashChange: paymentInfo.change,
          status: 'completed',
          completedAt: new Date(),
          originalTotal,
          finalTotal,
          adjustmentAmount: saleData?.adjustmentAmount,
          adjustmentType: saleData?.adjustmentType,
          adjustmentPercentage: saleData?.adjustmentPercentage,
          customerId: paymentInfo.customerId,
          customerInfo: paymentInfo.customerId
            ? { name: paymentInfo.customerName || 'Cliente' }
            : draft.customerInfo,
          balanceUsed: paymentInfo.balanceUsed,
        };

        set((curr) => ({
          salesHistory: curr.salesHistory.map((s) =>
            s.id === saleId ? updated : s
          ),
        }));

        // Cash transaction
        const cashTransaction: CashTransaction = {
          id: crypto.randomUUID(),
          type: 'ingreso',
          amount: finalTotal,
          description: `Venta #${saleId.slice(-8)}`,
          category: 'venta',
          paymentMethod: paymentInfo.method,
          reference: saleId,
          userId: 'user',
          createdAt: new Date(),
        };
        set((curr) => ({
          cashTransactions: [...curr.cashTransactions, cashTransaction],
        }));

        // Log activity
        useActivityStore.getState().addActivity({
          type: 'ingreso',
          description: `Comanda cerrada - ${updated.items.length} items`,
          amount: finalTotal,
          metadata: { saleId, action: 'order_draft_finalized' },
        });

        return updated;
      },

      // Stock Actions
      adjustStock: (
        productId,
        quantity,
        reason,
        previousStock,
        newStock,
        productName
      ) => {
        const movement: StockMovement = {
          id: crypto.randomUUID(),
          productId,
          type: quantity > 0 ? 'entrada' : 'salida',
          quantity: Math.abs(quantity),
          reason,
          userId: 'user',
          createdAt: new Date(),
          previousStock,
          newStock,
        };

        set((state) => ({
          stockMovements: [...state.stockMovements, movement],
        }));

        // Log stock activity
        useActivityStore.getState().addActivity({
          type: quantity > 0 ? 'ingreso' : 'egreso',
          description: `Ajuste de stock: ${productName} (${
            quantity > 0 ? '+' : ''
          }${quantity})`,
          metadata: {
            productId,
            movementId: movement.id,
            previousStock,
            newStock,
            reason,
            action: 'stock_adjustment',
          },
        });
      },

      // Employee Actions
      addEmployee: (employee) => {
        set((state) => ({
          employees: [...state.employees, employee],
        }));

        // Log activity
        useActivityStore.getState().addActivity({
          type: 'cambio_producto',
          description: `Empleado agregado: ${employee.name}`,
          metadata: { employeeId: employee.id, action: 'create' },
        });
      },

      updateEmployee: (id, updates) => {
        const state = get();
        const employee = state.employees.find((e) => e.id === id);

        set((state) => ({
          employees: state.employees.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: new Date() } : e
          ),
        }));

        // Log activity
        if (employee) {
          useActivityStore.getState().addActivity({
            type: 'cambio_producto',
            description: `Empleado actualizado: ${employee.name}`,
            metadata: { employeeId: id, updates, action: 'update' },
          });
        }
      },

      deleteEmployee: (id) => {
        const state = get();
        const employee = state.employees.find((e) => e.id === id);

        set((state) => ({
          employees: state.employees.filter((e) => e.id !== id),
        }));

        // Log activity
        if (employee) {
          useActivityStore.getState().addActivity({
            type: 'cambio_producto',
            description: `Empleado eliminado: ${employee.name}`,
            metadata: { employeeId: id, action: 'delete' },
          });
        }
      },

      // Financial Actions
      addExpense: (expense) => {
        set((state) => ({
          expenses: [...state.expenses, expense],
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
          createdAt: expense.createdAt,
        };

        set((state) => ({
          cashTransactions: [...state.cashTransactions, cashTransaction],
        }));

        // Log activity
        useActivityStore.getState().addActivity({
          type: 'egreso',
          description: `Gasto registrado: ${expense.description}`,
          amount: expense.amount,
          metadata: {
            expenseId: expense.id,
            category: expense.category,
            action: 'expense_added',
          },
        });
      },

      addCashTransaction: (transaction) => {
        set((state) => ({
          cashTransactions: [...state.cashTransactions, transaction],
        }));

        // Log activity
        useActivityStore.getState().addActivity({
          type: transaction.type,
          description: transaction.description,
          amount: transaction.amount,
          metadata: {
            transactionId: transaction.id,
            category: transaction.category,
            action: 'cash_transaction_added',
          },
        });
      },

      getFinancialSummary: (date = new Date()) => {
        const state = get();
        const targetDate = new Date(date);
        const startOfDay = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate()
        );
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

        // Filter transactions for the specific date
        const dayTransactions = state.cashTransactions.filter(
          (t) => t.createdAt >= startOfDay && t.createdAt < endOfDay
        );

        const dayExpenses = state.expenses.filter(
          (e) => e.createdAt >= startOfDay && e.createdAt < endOfDay
        );

        const daySales = state.salesHistory.filter(
          (s) => s.createdAt >= startOfDay && s.createdAt < endOfDay
        );

        // Calculate totals
        const totalIngresos = dayTransactions
          .filter((t) => t.type === 'ingreso')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalEgresos = dayTransactions
          .filter((t) => t.type === 'egreso')
          .reduce((sum, t) => sum + t.amount, 0);

        // Payment method breakdown
        const paymentMethodBreakdown: Record<
          | 'efectivo'
          | 'tarjeta'
          | 'transferencia'
          | 'mixto'
          | 'qr'
          | 'giftcard'
          | 'precio_lista',
          number
        > = {
          efectivo: 0,
          tarjeta: 0,
          transferencia: 0,
          mixto: 0,
          qr: 0,
          giftcard: 0,
          precio_lista: 0,
        };

        daySales.forEach((sale) => {
          paymentMethodBreakdown[sale.paymentMethod] += sale.total;
        });

        // Top expense categories
        const expenseCategories = new Map();
        dayExpenses.forEach((expense) => {
          if (expenseCategories.has(expense.category)) {
            const current = expenseCategories.get(expense.category);
            expenseCategories.set(expense.category, {
              amount: current.amount + expense.amount,
              count: current.count + 1,
            });
          } else {
            expenseCategories.set(expense.category, {
              amount: expense.amount,
              count: 1,
            });
          }
        });

        const topExpenseCategories = Array.from(
          expenseCategories.entries()
        ).map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count,
        }));

        return {
          date: targetDate,
          totalIngresos,
          totalEgresos,
          netBalance: totalIngresos - totalEgresos,
          salesCount: daySales.length,
          expensesCount: dayExpenses.length,
          paymentMethodBreakdown,
          topExpenseCategories,
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
        return state.products.filter(
          (p) => p.stock <= state.settings.lowStockThreshold
        );
      },
    }),
    {
      name: 'mistica-app-store',
      onRehydrateStorage: () => (state) => {
        // Initialize with mock products/employees if desired, but do NOT inject mock sales
        if (state && state.products.length === 0) {
          state.products = mockProducts;
        }
        if (state && state.employees.length === 0) {
          state.employees = mockEmployees;
        }
      },
    }
  )
);
