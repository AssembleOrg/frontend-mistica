/**
 * Products Hook - Backend Integration Ready
 * Now supports async operations, error handling, and loading states
 */

import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useProductsStore } from '@/stores/products.store';
import { productsService, CreateProductRequest, UpdateProductRequest } from '@/services/products.service';
import { ApiError } from '@/services/api.service';
import type { ProductCategory } from '@/lib/types';
import { showToast } from '@/lib/toast';

// Hook state interface
interface UseProductsState {
  loading: boolean;
  error: string | null;
  syncing: boolean; // For background sync operations
}

export function useProducts() {
  // Subscripciones granulares: cada componente sólo se re-renderea por las
  // slices que realmente lee (no por todo el store).
  const products = useProductsStore((s) => s.products);
  const selectedProduct = useProductsStore((s) => s.selectedProduct);
  const searchQuery = useProductsStore((s) => s.searchQuery);
  const selectedCategory = useProductsStore((s) => s.selectedCategory);
  const sortBy = useProductsStore((s) => s.sortBy);
  const sortOrder = useProductsStore((s) => s.sortOrder);
  const pagination = useProductsStore((s) => s.pagination);
  const storeIsLoading = useProductsStore((s) => s.loading.isLoading);
  const storeError = useProductsStore((s) => s.loading.error);

  // Acciones — referencias estables (Zustand garantiza estabilidad).
  const {
    setProducts,
    addProduct: addProductInStore,
    updateProduct: updateProductInStore,
    removeProduct: removeProductInStore,
    setLoading,
    setError,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    setSortOrder,
    setSelectedProduct,
    clearError: clearStoreError,
    getFilteredProducts,
    getSortedProducts,
    getLowStockProducts,
    getProductStats,
  } = useProductsStore(
    useShallow((s) => ({
      setProducts: s.setProducts,
      addProduct: s.addProduct,
      updateProduct: s.updateProduct,
      removeProduct: s.removeProduct,
      setLoading: s.setLoading,
      setError: s.setError,
      setSearchQuery: s.setSearchQuery,
      setSelectedCategory: s.setSelectedCategory,
      setSortBy: s.setSortBy,
      setSortOrder: s.setSortOrder,
      setSelectedProduct: s.setSelectedProduct,
      clearError: s.clearError,
      getFilteredProducts: s.getFilteredProducts,
      getSortedProducts: s.getSortedProducts,
      getLowStockProducts: s.getLowStockProducts,
      getProductStats: s.getProductStats,
    }))
  );

  const [state, setState] = useState<UseProductsState>({
    loading: false,
    error: null,
    syncing: false,
  });

  const handleApiError = useCallback(
    (error: unknown, action: string) => {
      const apiError = error as ApiError;
      const errorMessage = apiError?.message || `Error en ${action}`;
      setState((prev) => ({ ...prev, error: errorMessage }));
      setError(errorMessage);
      showToast.error(errorMessage);
      console.error(`${action} failed:`, error);
    },
    [setError]
  );

  // No automatic fetching - use useInitialProductsData hook instead

  const fetchProducts = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setLoading(true);
    try {
      const response = await productsService.getAllProducts();
      setProducts(response.data);
    } catch (error) {
      handleApiError(error, 'cargar productos');
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
      setLoading(false);
    }
  }, [handleApiError, setLoading, setProducts]);

  const createProduct = useCallback(
    async (data: CreateProductRequest) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await productsService.createProduct(data);
        addProductInStore(response.data);
        showToast.success('Producto creado exitosamente');
        return response.data;
      } catch (error) {
        handleApiError(error, 'crear producto');
        throw error;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [handleApiError, addProductInStore]
  );

  const updateProduct = useCallback(
    async (id: string, updates: UpdateProductRequest) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await productsService.updateProduct(id, updates);
        updateProductInStore(id, response.data);
        showToast.success('Producto actualizado exitosamente');
        return response.data;
      } catch (error) {
        handleApiError(error, 'actualizar producto');
        throw error;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [handleApiError, updateProductInStore]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await productsService.deleteProduct(id);
        removeProductInStore(id);
        showToast.success('Producto eliminado exitosamente');
      } catch (error) {
        handleApiError(error, 'eliminar producto');
        throw error;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [handleApiError, removeProductInStore]
  );

  const addStock = useCallback(
    async (id: string, quantity: number) => {
      setState((prev) => ({ ...prev, syncing: true }));
      try {
        const response = await productsService.addStock(id, quantity);
        updateProductInStore(id, { stock: response.data.stock });
        showToast.success(`Stock agregado: +${quantity} unidades`);
        return response.data;
      } catch (error) {
        handleApiError(error, 'agregar stock');
        throw error;
      } finally {
        setState((prev) => ({ ...prev, syncing: false }));
      }
    },
    [handleApiError, updateProductInStore]
  );

  const subtractStock = useCallback(
    async (id: string, quantity: number) => {
      setState((prev) => ({ ...prev, syncing: true }));
      try {
        const response = await productsService.subtractStock(id, quantity);
        updateProductInStore(id, { stock: response.data.stock });
        showToast.success(`Stock reducido: -${quantity} unidades`);
        return response.data;
      } catch (error) {
        handleApiError(error, 'reducir stock');
        throw error;
      } finally {
        setState((prev) => ({ ...prev, syncing: false }));
      }
    },
    [handleApiError, updateProductInStore]
  );

  const searchProducts = useCallback(
    (query: string, category?: ProductCategory) => {
      setSearchQuery(query);
      if (category) setSelectedCategory(category);
      return getFilteredProducts();
    },
    [setSearchQuery, setSelectedCategory, getFilteredProducts]
  );

  const getProduct = useCallback(
    async (id: string) => {
      const localProduct = products.find((p) => p.id === id);
      if (localProduct) return localProduct;
      try {
        const response = await productsService.getProduct(id);
        return response.data;
      } catch (error) {
        handleApiError(error, 'obtener producto');
        return null;
      }
    },
    [handleApiError, products]
  );

  const getProductsByCategory = useCallback(
    async (category: ProductCategory, page = 1, limit = 20) => {
      setState((prev) => ({ ...prev, loading: true }));
      try {
        const response = await productsService.getProductsByCategory(category, page, limit);
        return response.data;
      } catch (error) {
        handleApiError(error, 'obtener productos por categoría');
        return null;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [handleApiError]
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
    clearStoreError();
  }, [clearStoreError]);

  // Computeds: dependen sólo de las slices que afectan al resultado.
  const filteredProducts = useMemo(
    () => getFilteredProducts(),
    [getFilteredProducts, products, searchQuery, selectedCategory]
  );
  const sortedProducts = useMemo(
    () => getSortedProducts(filteredProducts),
    [getSortedProducts, filteredProducts, sortBy, sortOrder]
  );
  const lowStockProducts = useMemo(
    () => getLowStockProducts(),
    [getLowStockProducts, products]
  );
  const stats = useMemo(() => getProductStats(), [getProductStats, products]);

  return {
    products,
    filteredProducts,
    sortedProducts,
    selectedProduct,

    loading: state.loading || storeIsLoading,
    error: state.error || storeError,
    syncing: state.syncing,

    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    addStock,
    subtractStock,
    getProduct,
    getProductsByCategory,

    searchProducts,
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    setSortOrder,

    lowStockProducts,
    stats,

    setSelectedProduct,
    clearError,

    searchQuery,
    selectedCategory,
    sortBy,
    sortOrder,
    pagination,
  };
}