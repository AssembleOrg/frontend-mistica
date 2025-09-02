/**
 * Products Hook - Backend Integration Ready
 * Now supports async operations, error handling, and loading states
 */

import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useProductsStore } from '@/stores/products.store';
import { productsService, CreateProductRequest, UpdateProductRequest } from '@/services/products.service';
import { ApiError } from '@/services/api.service';
import type { Product, ProductCategory } from '@/lib/types';
import { generateBarcode } from '@/lib/barcode-utils';
import { showToast } from '@/lib/toast';

// Hook state interface
interface UseProductsState {
  loading: boolean;
  error: string | null;
  syncing: boolean; // For background sync operations
}

export function useProducts() {
  const store = useProductsStore();
  const [state, setState] = useState<UseProductsState>({
    loading: false,
    error: null,
    syncing: false,
  });

  // Stable reference to store to avoid recreating callbacks
  const storeRef = useRef(store);
  storeRef.current = store;

  // Handle API errors with stable reference
  const handleApiError = useCallback((error: unknown, action: string) => {
    const apiError = error as ApiError;
    const errorMessage = apiError?.message || `Error en ${action}`;
    
    setState(prev => ({ ...prev, error: errorMessage }));
    storeRef.current.setError(errorMessage);
    showToast.error(errorMessage);
    
    console.error(`${action} failed:`, error);
  }, []);

  // No automatic fetching - use useInitialProductsData hook instead

  // Fetch all products from API with stable reference
  const fetchProducts = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    storeRef.current.setLoading(true);
    
    try {
      const response = await productsService.getAllProducts();
      storeRef.current.setProducts(response.data);
      setState(prev => ({ ...prev, loading: false }));
      storeRef.current.setLoading(false);
    } catch (error) {
      handleApiError(error, 'cargar productos');
      setState(prev => ({ ...prev, loading: false }));
      storeRef.current.setLoading(false);
    }
  }, [handleApiError]);

  // Create product (async) with stable reference
  const createProduct = useCallback(async (data: CreateProductRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await productsService.createProduct(data);
      storeRef.current.addProduct(response.data);
      
      showToast.success('Producto creado exitosamente');
      setState(prev => ({ ...prev, loading: false }));
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'crear producto');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [handleApiError]);

  // Update product (async) with stable reference
  const updateProduct = useCallback(async (id: string, updates: UpdateProductRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await productsService.updateProduct(id, updates);
      storeRef.current.updateProduct(id, response.data);
      
      showToast.success('Producto actualizado exitosamente');
      setState(prev => ({ ...prev, loading: false }));
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'actualizar producto');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [handleApiError]);

  // Delete product (async) with stable reference
  const deleteProduct = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      await productsService.deleteProduct(id);
      storeRef.current.removeProduct(id);
      
      showToast.success('Producto eliminado exitosamente');
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      handleApiError(error, 'eliminar producto');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [handleApiError]);

  // Add stock (async) with stable reference
  const addStock = useCallback(async (id: string, quantity: number) => {
    setState(prev => ({ ...prev, syncing: true }));
    
    try {
      const response = await productsService.addStock(id, quantity);
      storeRef.current.updateProduct(id, { stock: response.data.stock });
      
      showToast.success(`Stock agregado: +${quantity} unidades`);
      setState(prev => ({ ...prev, syncing: false }));
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'agregar stock');
      setState(prev => ({ ...prev, syncing: false }));
      throw error;
    }
  }, [handleApiError]);

  // Subtract stock (async) with stable reference
  const subtractStock = useCallback(async (id: string, quantity: number) => {
    setState(prev => ({ ...prev, syncing: true }));
    
    try {
      const response = await productsService.subtractStock(id, quantity);
      storeRef.current.updateProduct(id, { stock: response.data.stock });
      
      showToast.success(`Stock reducido: -${quantity} unidades`);
      setState(prev => ({ ...prev, syncing: false }));
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'reducir stock');
      setState(prev => ({ ...prev, syncing: false }));
      throw error;
    }
  }, [handleApiError]);

  // Search products (local - using store selectors) with stable reference
  const searchProducts = useCallback((query: string, category?: ProductCategory) => {
    storeRef.current.setSearchQuery(query);
    if (category) {
      storeRef.current.setSelectedCategory(category);
    }
    return storeRef.current.getFilteredProducts();
  }, []);

  // Get product by ID (async from API if needed) with stable reference
  const getProduct = useCallback(async (id: string) => {
    const localProduct = storeRef.current.products.find(p => p.id === id);
    if (localProduct) {
      return localProduct;
    }
    
    try {
      const response = await productsService.getProduct(id);
      return response.data;
    } catch (error) {
      handleApiError(error, 'obtener producto');
      return null;
    }
  }, [handleApiError]);

  // Get products by category (async)
  const getProductsByCategory = useCallback(async (category: ProductCategory, page = 1, limit = 20) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await productsService.getProductsByCategory(category, page, limit);
      setState(prev => ({ ...prev, loading: false }));
      return response.data;
    } catch (error) {
      handleApiError(error, 'obtener productos por categoría');
      setState(prev => ({ ...prev, loading: false }));
      return null;
    }
  }, [handleApiError]);

  // Manual fetch method (no automatic fetching)
  // Use useInitialProductsData hook in components for initial data loading

  // Clear error with stable reference
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    storeRef.current.clearError();
  }, []);

  // Computed values from store - memoized for performance
  const filteredProducts = useMemo(() => store.getFilteredProducts(), [
    store.products, store.searchQuery, store.selectedCategory
  ]);
  
  const sortedProducts = useMemo(() => store.getSortedProducts(filteredProducts), [
    filteredProducts, store.sortBy, store.sortOrder
  ]);
  
  const lowStockProducts = useMemo(() => store.getLowStockProducts(), [
    store.products
  ]);
  
  const stats = useMemo(() => store.getProductStats(), [
    store.products
  ]);

  return {
    // Data
    products: store.products,
    filteredProducts,
    sortedProducts,
    selectedProduct: store.selectedProduct,
    
    // State
    loading: state.loading || store.loading.isLoading,
    error: state.error || store.loading.error,
    syncing: state.syncing,
    
    // Actions
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    addStock,
    subtractStock,
    getProduct,
    getProductsByCategory,
    
    // Search & Filter
    searchProducts,
    setSearchQuery: store.setSearchQuery,
    setSelectedCategory: store.setSelectedCategory,
    setSortBy: store.setSortBy,
    setSortOrder: store.setSortOrder,
    
    // Selectors
    lowStockProducts,
    stats,
    
    // UI
    setSelectedProduct: store.setSelectedProduct,
    clearError,
    
    // Store state
    searchQuery: store.searchQuery,
    selectedCategory: store.selectedCategory,
    sortBy: store.sortBy,
    sortOrder: store.sortOrder,
    pagination: store.pagination,
  };
}