/**
 * Initial Employees Data Hook - NextJS Pattern
 * 
 * Handles initial data fetching with proper error boundaries
 * and prevents multiple unnecessary requests
 */

import { useEffect, useRef } from 'react';
import { useEmployeesStore } from '@/stores/employees.store';
import { employeesService } from '@/services/employees.service';
import { toast } from 'sonner';

interface UseInitialEmployeesDataOptions {
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

export function useInitialEmployeesData(options: UseInitialEmployeesDataOptions = {}) {
  const {
    skipIfExists = true,
    showErrorToast = true,
    onError,
    onSuccess
  } = options;
  
  const store = useEmployeesStore();
  
  // Prevent multiple fetches
  const fetchAttempted = useRef(false);
  const isFetching = useRef(false);

  // Manually hydrate store on client side (required with skipHydration: true)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('👥 useInitialEmployeesData: Hidrando store manualmente');
      // Force rehydration from localStorage
      const hasHydrated = useEmployeesStore.persist?.hasHydrated();
      if (!hasHydrated) {
        useEmployeesStore.persist?.rehydrate();
      }
    }
  }, []); // Run once on mount
  
  useEffect(() => {
    const shouldFetch = (
      !fetchAttempted.current && 
      !isFetching.current && 
      (!skipIfExists || store.employees.length === 0)
    );
    
    if (!shouldFetch) return;
    
    fetchAttempted.current = true;
    isFetching.current = true;
    
    const fetchInitialData = async () => {
      store.setLoading(true);
      
      try {
        console.log('👥 EMPLEADOS: Llamando a employeesService.getAllEmployees()');
        const response = await employeesService.getAllEmployees();
        console.log('👥 EMPLEADOS: Respuesta recibida:', response);
        
        store.setEmployees(response.data);
        store.setLoading(false);
        console.log('👥 EMPLEADOS: Empleados guardados en store:', response.data.length);
        onSuccess?.();
      } catch (error) {
        console.error('👥 EMPLEADOS: Error en fetch:', error);
        store.setLoading(false);
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Error al cargar empleados';
        
        store.setError(errorMessage);
        
        if (showErrorToast) {
          toast.error(errorMessage);
        }
        
        onError?.(error);
        console.error('Initial employees fetch failed:', error);
      } finally {
        isFetching.current = false;
      }
    };
    
    fetchInitialData();
  }, []); // Empty dependencies - only run once on mount
  
  return {
    isLoading: store.loading.isLoading,
    error: store.loading.error,
    employees: store.employees,
    hasData: store.employees.length > 0
  };
}