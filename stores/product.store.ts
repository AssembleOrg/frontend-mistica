// stores/product.store.ts

import { create } from 'zustand';
import { Product } from '@/lib/types';
import { mockProducts, getProductStats, getLowStockProducts } from '@/lib/mock-data';

interface ProductState {
  products: Product[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  
  // Actions
  loadProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (category: Product['category']) => Product[];
  getProductStats: () => { total: number; active: number; outOfStock: number; lowStock: number };
  getLowStockProducts: (threshold?: number) => Product[];
  searchProducts: (query: string) => Product[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Stock management functions
  updateStock: (productId: string, newStock: number, reason: string, userId?: string) => Promise<void>;
  reduceStock: (productId: string, quantity: number, reason: string, reference?: string, userId?: string) => Promise<void>;
  addStock: (productId: string, quantity: number, reason: string, reference?: string, userId?: string) => Promise<void>;
}

export const useProductStore = create<ProductState>()((set, get) => ({
  products: [],
  status: 'idle',
  error: null,

  loadProducts: async () => {
    set({ status: 'loading', error: null });
    
    try {
      // Simulate API delay - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      set({
        products: mockProducts,
        status: 'success',
        error: null,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading products';
      set({
        status: 'error',
        error: errorMessage,
      });
    }
  },

  addProduct: async (productData) => {
    set({ status: 'loading', error: null });
    
    try {
      const newProduct: Product = {
        ...productData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));

      set((state) => ({
        products: [newProduct, ...state.products],
        status: 'success',
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error adding product';
      set({
        status: 'error',
        error: errorMessage,
      });
      throw error;
    }
  },

  updateProduct: async (id, updates) => {
    set({ status: 'loading', error: null });
    
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));

      set((state) => ({
        products: state.products.map((product) =>
          product.id === id
            ? { ...product, ...updates, updatedAt: new Date() }
            : product
        ),
        status: 'success',
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating product';
      set({
        status: 'error',
        error: errorMessage,
      });
      throw error;
    }
  },

  deleteProduct: async (id) => {
    set({ status: 'loading', error: null });
    
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));

      set((state) => ({
        products: state.products.filter((product) => product.id !== id),
        status: 'success',
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error deleting product';
      set({
        status: 'error',
        error: errorMessage,
      });
      throw error;
    }
  },

  getProductById: (id) => {
    return get().products.find((product) => product.id === id);
  },

  getProductsByCategory: (category) => {
    return get().products.filter((product) => product.category === category);
  },

  getProductStats: () => {
    const products = get().products;
    return {
      total: products.length,
      active: products.filter((p) => p.status === 'active').length,
      outOfStock: products.filter((p) => p.status === 'out_of_stock').length,
      lowStock: products.filter((p) => p.stock <= 10 && p.stock > 0).length,
    };
  },

  getLowStockProducts: (threshold = 10) => {
    return get().products.filter(
      (product) => product.stock <= threshold && product.stock > 0
    );
  },

  searchProducts: (query) => {
    const lowercaseQuery = query.toLowerCase();
    return get().products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.description.toLowerCase().includes(lowercaseQuery) ||
        product.category.toLowerCase().includes(lowercaseQuery)
    );
  },

  setLoading: (loading) => {
    set({
      status: loading ? 'loading' : 'idle',
      error: loading ? null : get().error,
    });
  },

  setError: (error) => {
    set({
      status: error ? 'error' : 'success',
      error,
    });
  },

  // Stock management functions
  updateStock: async (productId, newStock, reason, userId = 'system') => {
    const product = get().getProductById(productId);
    if (!product) throw new Error('Product not found');

    const previousStock = product.stock;
    
    try {
      // Update product stock
      await get().updateProduct(productId, { stock: newStock });
      
      // Create stock movement if stock store is available
      if (typeof window !== 'undefined') {
        const stockStore = (window as any).stockStore;
        if (stockStore?.addMovement) {
          stockStore.addMovement({
            productId,
            type: 'ajuste',
            quantity: Math.abs(newStock - previousStock),
            reason,
            userId,
            previousStock,
            newStock,
          });
        }

        // Check for alerts
        if (stockStore?.checkStockAlerts) {
          stockStore.checkStockAlerts(productId, newStock);
        }
      }
    } catch (error) {
      throw error;
    }
  },

  reduceStock: async (productId, quantity, reason, reference, userId = 'system') => {
    const product = get().getProductById(productId);
    if (!product) throw new Error('Product not found');
    if (product.stock < quantity) throw new Error('Insufficient stock');

    const previousStock = product.stock;
    const newStock = previousStock - quantity;
    
    try {
      // Update product stock
      await get().updateProduct(productId, { stock: newStock });
      
      // Create stock movement if stock store is available
      if (typeof window !== 'undefined') {
        const stockStore = (window as any).stockStore;
        if (stockStore?.addMovement) {
          stockStore.addMovement({
            productId,
            type: 'salida',
            quantity,
            reason,
            reference,
            userId,
            previousStock,
            newStock,
          });
        }

        // Check for alerts
        if (stockStore?.checkStockAlerts) {
          stockStore.checkStockAlerts(productId, newStock);
        }
      }
    } catch (error) {
      throw error;
    }
  },

  addStock: async (productId, quantity, reason, reference, userId = 'system') => {
    const product = get().getProductById(productId);
    if (!product) throw new Error('Product not found');

    const previousStock = product.stock;
    const newStock = previousStock + quantity;
    
    try {
      // Update product stock
      await get().updateProduct(productId, { stock: newStock });
      
      // Create stock movement if stock store is available
      if (typeof window !== 'undefined') {
        const stockStore = (window as any).stockStore;
        if (stockStore?.addMovement) {
          stockStore.addMovement({
            productId,
            type: 'entrada',
            quantity,
            reason,
            reference,
            userId,
            previousStock,
            newStock,
          });
        }

        // Check for alerts  
        if (stockStore?.checkStockAlerts) {
          stockStore.checkStockAlerts(productId, newStock);
        }
      }
    } catch (error) {
      throw error;
    }
  },
}));

// Export types for component usage
export type { Product };