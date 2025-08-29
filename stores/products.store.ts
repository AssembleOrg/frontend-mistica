// stores/products.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, ProductCategory } from '@/lib/types';

// Loading state interface
interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Products store state
interface ProductsState {
  // Data
  products: Product[];
  selectedProduct: Product | null;
  
  // UI State
  loading: LoadingState;
  searchQuery: string;
  selectedCategory: ProductCategory | 'all';
  sortBy: 'name' | 'price' | 'stock' | 'category';
  sortOrder: 'asc' | 'desc';
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Synchronous actions (only state updates, no API calls)
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  
  // UI Actions
  setSelectedProduct: (product: Product | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: ProductCategory | 'all') => void;
  setSortBy: (sortBy: 'name' | 'price' | 'stock' | 'category') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  
  // Pagination Actions
  setPagination: (pagination: Partial<ProductsState['pagination']>) => void;
  nextPage: () => void;
  prevPage: () => void;
  
  // Computed/Selectors (pure functions)
  getFilteredProducts: () => Product[];
  getSortedProducts: (products: Product[]) => Product[];
  getLowStockProducts: (threshold?: number) => Product[];
  getProductsByCategory: (category: ProductCategory) => Product[];
  getProductStats: () => {
    total: number;
    totalValue: number;
    lowStock: number;
    outOfStock: number;
    avgPrice: number;
  };
  
  // Utility Actions
  clearError: () => void;
  reset: () => void;
}

// Initial state
const initialState = {
  products: [],
  selectedProduct: null,
  loading: { isLoading: false, error: null },
  searchQuery: '',
  selectedCategory: 'all' as const,
  sortBy: 'name' as const,
  sortOrder: 'asc' as const,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

export const useProductsStore = create<ProductsState>()(
  persist(
    (set, get) => ({
      // Initial State
      ...initialState,

      // Synchronous Actions - Only update state, no side effects
      setProducts: (products) => {
        set((state) => ({
          products,
          pagination: {
            ...state.pagination,
            total: products.length,
            totalPages: Math.ceil(products.length / state.pagination.limit),
          },
        }));
      },

      addProduct: (product) => {
        set((state) => ({
          products: [...state.products, product],
        }));
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map((product) =>
            product.id === id ? { ...product, ...updates } : product
          ),
          selectedProduct:
            state.selectedProduct?.id === id
              ? { ...state.selectedProduct, ...updates }
              : state.selectedProduct,
        }));
      },

      removeProduct: (id) => {
        set((state) => ({
          products: state.products.filter((product) => product.id !== id),
          selectedProduct:
            state.selectedProduct?.id === id ? null : state.selectedProduct,
        }));
      },

      // UI Actions
      setSelectedProduct: (product) => {
        set({ selectedProduct: product });
      },

      setLoading: (isLoading) => {
        set((state) => ({
          loading: { ...state.loading, isLoading },
        }));
      },

      setError: (error) => {
        set((state) => ({
          loading: { ...state.loading, error },
        }));
      },

      setSearchQuery: (searchQuery) => {
        set({ searchQuery });
      },

      setSelectedCategory: (selectedCategory) => {
        set({ selectedCategory });
      },

      setSortBy: (sortBy) => {
        set({ sortBy });
      },

      setSortOrder: (sortOrder) => {
        set({ sortOrder });
      },

      // Pagination Actions
      setPagination: (pagination) => {
        set((state) => ({
          pagination: { ...state.pagination, ...pagination },
        }));
      },

      nextPage: () => {
        set((state) => {
          const nextPage = Math.min(
            state.pagination.page + 1,
            state.pagination.totalPages
          );
          return {
            pagination: { ...state.pagination, page: nextPage },
          };
        });
      },

      prevPage: () => {
        set((state) => {
          const prevPage = Math.max(state.pagination.page - 1, 1);
          return {
            pagination: { ...state.pagination, page: prevPage },
          };
        });
      },

      // Computed/Selectors
      getFilteredProducts: () => {
        const { products, searchQuery, selectedCategory } = get();
        
        let filtered = [...products];
        
        // Filter by search query
        if (searchQuery) {
          filtered = filtered.filter((product) =>
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.barcode.includes(searchQuery) ||
            product.description?.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        // Filter by category
        if (selectedCategory !== 'all') {
          filtered = filtered.filter((product) => product.category === selectedCategory);
        }
        
        return filtered;
      },

      getSortedProducts: (products) => {
        const { sortBy, sortOrder } = get();
        
        return [...products].sort((a, b) => {
          let aVal: any = a[sortBy];
          let bVal: any = b[sortBy];
          
          // Handle string comparison
          if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
          }
          
          let result = 0;
          if (aVal < bVal) result = -1;
          if (aVal > bVal) result = 1;
          
          return sortOrder === 'desc' ? -result : result;
        });
      },

      getLowStockProducts: (threshold = 10) => {
        const { products } = get();
        return products.filter((product) => product.stock <= threshold);
      },

      getProductsByCategory: (category) => {
        const { products } = get();
        return products.filter((product) => product.category === category);
      },

      getProductStats: () => {
        const { products } = get();
        
        if (products.length === 0) {
          return {
            total: 0,
            totalValue: 0,
            lowStock: 0,
            outOfStock: 0,
            avgPrice: 0,
          };
        }
        
        const total = products.length;
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        const lowStock = products.filter((p) => p.stock <= 10 && p.stock > 0).length;
        const outOfStock = products.filter((p) => p.stock === 0).length;
        const avgPrice = products.reduce((sum, p) => sum + p.price, 0) / total;
        
        return {
          total,
          totalValue,
          lowStock,
          outOfStock,
          avgPrice: Math.round(avgPrice * 100) / 100,
        };
      },

      // Utility Actions
      clearError: () => {
        set((state) => ({
          loading: { ...state.loading, error: null },
        }));
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'mistica-products-storage',
      // Only persist essential data, not UI state
      partialize: (state) => ({
        products: state.products,
        selectedProduct: state.selectedProduct,
      }),
      // Skip persisting loading states and UI preferences
      skipHydration: false,
    }
  )
);