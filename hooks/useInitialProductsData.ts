/**
 * Initial Products Data Hook - NextJS Pattern
 *
 * Trae el catálogo desde el backend al montar. El store no persiste productos:
 * el backend es la única fuente de verdad, así que siempre pedimos la lista
 * fresca (antes se servía un cache de localStorage que mostraba productos ya
 * borrados y precios viejos).
 */

import { useEffect, useRef } from 'react';
import { useProductsStore } from '@/stores/products.store';
import { productsService } from '@/services/products.service';
import { toast } from 'sonner';
import { log } from '@/lib/logger';
import { translateApiError } from '@/lib/api-error-messages';
import type { ApiError } from '@/services/api.service';

interface UseInitialProductsDataOptions {
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
    showErrorToast = true,
    onError,
    onSuccess
  } = options;

  const store = useProductsStore();

  // Evita dobles fetch por el doble-render de StrictMode en dev.
  const fetchAttempted = useRef(false);

  useEffect(() => {
    if (fetchAttempted.current) return;
    fetchAttempted.current = true;

    const fetchInitialData = async () => {
      store.setLoading(true);

      try {
        log.debug('📦 PRODUCTOS: Llamando a productsService.getAllProducts()');
        const response = await productsService.getAllProducts();
        log.debug('📦 PRODUCTOS: Respuesta recibida:', response);

        store.setProducts(response.data);
        store.setLoading(false);
        log.debug('📦 PRODUCTOS: Productos guardados en store:', response.data.length);
        onSuccess?.();
      } catch (error) {
        console.error('📦 PRODUCTOS: Error en fetch:', error);
        store.setLoading(false);

        const apiError = error as ApiError;
        const errorMessage = translateApiError(
          apiError?.message,
          apiError?.status,
          'No se pudieron cargar los productos.'
        );

        store.setError(errorMessage);

        if (showErrorToast) {
          toast.error(errorMessage);
        }

        onError?.(error);
      }
    };

    fetchInitialData();
    // Sólo al montar: el fetch inicial no debe repetirse por cambios de estado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isLoading: store.loading.isLoading,
    error: store.loading.error,
    products: store.products,
    hasData: store.products.length > 0
  };
}
