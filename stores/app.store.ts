/**
 * SIMPLE APP STORE - Todo en uno para MVP
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, Sale, StockMovement, CartItem } from '@/lib/types';
import { mockProducts, mockSales } from '@/lib/mock-data';
import { useActivityStore } from './activity.store';

interface AppState {
  // Products
  products: Product[];
  
  // Sales & Cart
  cart: CartItem[];
  salesHistory: Sale[];
  
  // Stock
  stockMovements: StockMovement[];
  
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
  
  // Cart Actions
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Sales Actions
  completeSale: (paymentMethod: string, cashReceived?: number) => Sale;
  editSale: (saleId: string, updates: { paymentMethod?: Sale['paymentMethod']; notes?: string; customerInfo?: any }) => boolean;
  
  // Stock Actions
  adjustStock: (productId: string, quantity: number, reason: string) => void;
  
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
      settings: {
        taxRate: 0.19,
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
      completeSale: (paymentMethod, cashReceived) => {
        const state = get();
        const subtotal = state.getCartTotal();
        const taxAmount = subtotal * state.settings.taxRate;
        const total = subtotal + taxAmount;

        const sale: Sale = {
          id: crypto.randomUUID(),
          items: state.cart.map(item => {
            const product = state.products.find(p => p.id === item.productId)!;
            return {
              id: crypto.randomUUID(),
              productId: item.productId,
              product: product,
              quantity: item.quantity,
              unitPrice: item.price,
              subtotal: item.subtotal
            };
          }),
          subtotal,
          discountTotal: 0,
          taxAmount,
          total,
          paymentMethod: paymentMethod as any,
          cashReceived,
          cashChange: cashReceived ? Math.max(0, cashReceived - total) : undefined,
          status: 'completed',
          cashierId: 'user',
          createdAt: new Date(),
          completedAt: new Date()
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
          amount: total,
          metadata: { 
            saleId: sale.id, 
            paymentMethod, 
            itemCount: state.cart.length,
            action: 'sale_completed'
          }
        });

        return sale;
      },

      editSale: (saleId, updates) => {
        const state = get();
        const sale = state.salesHistory.find(s => s.id === saleId);
        
        if (!sale) return false;
        
        // Restriction: Only allow edits within 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (sale.createdAt < twentyFourHoursAgo) {
          return false;
        }
        
        // Only allow editing certain fields (not quantities or items)
        const allowedUpdates: Partial<Sale> = {};
        if (updates.paymentMethod) allowedUpdates.paymentMethod = updates.paymentMethod;
        if (updates.notes !== undefined) allowedUpdates.notes = updates.notes;
        if (updates.customerInfo) allowedUpdates.customerInfo = updates.customerInfo;
        
        set(state => ({
          salesHistory: state.salesHistory.map(s =>
            s.id === saleId ? { ...s, ...allowedUpdates, updatedAt: new Date() } : s
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
      adjustStock: (productId, quantity, reason) => {
        const state = get();
        const product = state.products.find(p => p.id === productId);
        if (!product) return;

        const newStock = product.stock + quantity;
        state.updateProduct(productId, { stock: newStock });

        const movement: StockMovement = {
          id: crypto.randomUUID(),
          productId,
          type: quantity > 0 ? 'entrada' : 'salida',
          quantity: Math.abs(quantity),
          reason,
          userId: 'user',
          createdAt: new Date(),
          previousStock: product.stock,
          newStock
        };

        set(state => ({
          stockMovements: [...state.stockMovements, movement]
        }));

        // Log stock activity
        useActivityStore.getState().addActivity({
          type: quantity > 0 ? 'ingreso' : 'egreso',
          description: `Ajuste de stock: ${product.name} (${quantity > 0 ? '+' : ''}${quantity})`,
          metadata: { 
            productId, 
            movementId: movement.id,
            previousStock: product.stock,
            newStock,
            reason,
            action: 'stock_adjustment'
          }
        });
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
        return state.products.filter(p => p.stock <= state.settings.lowStockThreshold && p.status === 'active');
      }
    }),
    {
      name: 'mistica-app-store',
      onRehydrateStorage: () => (state) => {
        // Initialize with mock data if empty
        if (state && state.products.length === 0) {
          state.products = mockProducts;
        }
        if (state && state.salesHistory.length === 0) {
          state.salesHistory = mockSales;
        }
      }
    }
  )
);