/**
 * Initial Products Data Hook - NextJS Pattern
 * 
 * Handles initial data fetching with proper error boundaries
 * and prevents multiple unnecessary requests
 */

import { useEffect, useRef } from 'react';
import { useProductsStore } from '@/stores/products.store';
import { productsService } from '@/services/products.service';
import { toast } from 'sonner';

interface UseInitialProductsDataOptions {
  /**
   * Skip the initial fetch if data already exists
   * @default true
   */
  skipIfExists?: boolean;
  
  /**
   * Show error toast on failure
   * @default true
   */
  showErrorToast?: boolean;
  
  /**
   * Custom error handler
   */
  onError?: (error: unknown) => void;
  
  /**
   * Custom success handler
   */
  onSuccess?: () => void;
}

export function useInitialProductsData(options: UseInitialProductsDataOptions = {}) {
  const {
    skipIfExists = true,
    showErrorToast = true,
    onError,
    onSuccess
  } = options;
  
  const store = useProductsStore();
  
  // Prevent multiple fetches
  const fetchAttempted = useRef(false);
  const isFetching = useRef(false);

  // Manually hydrate store on client side (required with skipHydration: true)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🔄 useInitialProductsData: Hidrando store manualmente');
      // Force rehydration from localStorage
      const hasHydrated = useProductsStore.persist?.hasHydrated();
      if (!hasHydrated) {
        useProductsStore.persist?.rehydrate();
      }
    }
  }, []); // Run once on mount
  
  useEffect(() => {
    const shouldFetch = (
      !fetchAttempted.current && 
      !isFetching.current && 
      (!skipIfExists || store.products.length === 0)
    );
    
    if (!shouldFetch) return;
    
    fetchAttempted.current = true;
    isFetching.current = true;
    
    const fetchInitialData = async () => {
      store.setLoading(true);
      
      try {
        console.log('📦 PRODUCTOS: Llamando a productsService.getAllProducts()');
        const response = await productsService.getAllProducts();
        console.log('📦 PRODUCTOS: Respuesta recibida:', response);
        
        store.setProducts(response.data);
        store.setLoading(false);
        console.log('📦 PRODUCTOS: Productos guardados en store:', response.data.length);
        onSuccess?.();
      } catch (error) {
        console.error('📦 PRODUCTOS: Error en fetch:', error);
        store.setLoading(false);
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Error al cargar productos';
        
        store.setError(errorMessage);
        
        if (showErrorToast) {
          toast.error(errorMessage);
        }
        
        onError?.(error);
        console.error('Initial products fetch failed:', error);
      } finally {
        isFetching.current = false;
      }
    };
    
    fetchInitialData();
  }, []); // Empty dependencies - only run once on mount
  
  return {
    isLoading: store.loading.isLoading,
    error: store.loading.error,
    products: store.products,
    hasData: store.products.length > 0
  };
}