import { useCallback, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useProductsStore } from '@/stores/products.store';
import { useEmployeesStore } from '@/stores/employees.store';
import { productsService } from '@/services/products.service';
import { employeesService } from '@/services/employees.service';

interface InitializationState {
  products: boolean;
  employees: boolean;
}

interface InitializationStatus {
  loading: boolean;
  error: string | null;
  lastInitialized: Date | null;
}

type ModuleType = keyof InitializationState;

/**
 * Smart App Initialization Hook
 *
 * Manages lazy loading and prevents duplicate data fetching across the app.
 */
export function useAppInitialization() {
  const [initialized, setInitialized] = useState<InitializationState>({
    products: false,
    employees: false,
  });

  const [status, setStatus] = useState<Record<ModuleType, InitializationStatus>>({
    products: { loading: false, error: null, lastInitialized: null },
    employees: { loading: false, error: null, lastInitialized: null },
  });

  // Refs para guardas concurrentes — evitamos meterlo en deps de callbacks.
  const inFlightRef = useRef<Record<ModuleType, boolean>>({
    products: false,
    employees: false,
  });

  // Selectors granulares — sólo nos importan los `length` (primitivos estables).
  const productsCount = useProductsStore((s) => s.products.length);
  const employeesCount = useEmployeesStore((s) => s.employees.length);

  const { setProducts, setProductsLoading, setProductsError } = useProductsStore(
    useShallow((s) => ({
      setProducts: s.setProducts,
      setProductsLoading: s.setLoading,
      setProductsError: s.setError,
    }))
  );

  const { setEmployees, setEmployeesLoading, setEmployeesError } = useEmployeesStore(
    useShallow((s) => ({
      setEmployees: s.setEmployees,
      setEmployeesLoading: s.setLoading,
      setEmployeesError: s.setError,
    }))
  );

  const isModuleInitialized = useCallback(
    (module: ModuleType): boolean => {
      switch (module) {
        case 'products':
          return initialized.products || productsCount > 0;
        case 'employees':
          return initialized.employees || employeesCount > 0;
        default:
          return false;
      }
    },
    [initialized, productsCount, employeesCount]
  );

  const getModuleStatus = useCallback(
    (module: ModuleType) => ({
      initialized: isModuleInitialized(module),
      ...status[module],
    }),
    [isModuleInitialized, status]
  );

  const initializeProducts = useCallback(async (): Promise<boolean> => {
    if (initialized.products || productsCount > 0) return true;
    if (inFlightRef.current.products) return false;

    inFlightRef.current.products = true;
    try {
      setStatus((prev) => ({
        ...prev,
        products: { ...prev.products, loading: true, error: null },
      }));
      setProductsLoading(true);
      setProductsError(null);

      const fetched = await productsService.getAllProducts();
      setProducts(fetched.data);
      setInitialized((prev) => ({ ...prev, products: true }));
      setStatus((prev) => ({
        ...prev,
        products: { loading: false, error: null, lastInitialized: new Date() },
      }));
      setProductsLoading(false);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error loading products';
      setStatus((prev) => ({
        ...prev,
        products: { loading: false, error: message, lastInitialized: null },
      }));
      setProductsError(message);
      setProductsLoading(false);
      return false;
    } finally {
      inFlightRef.current.products = false;
    }
  }, [initialized.products, productsCount, setProducts, setProductsLoading, setProductsError]);

  const initializeEmployees = useCallback(async (): Promise<boolean> => {
    if (initialized.employees || employeesCount > 0) return true;
    if (inFlightRef.current.employees) return false;

    inFlightRef.current.employees = true;
    try {
      setStatus((prev) => ({
        ...prev,
        employees: { ...prev.employees, loading: true, error: null },
      }));
      setEmployeesLoading(true);
      setEmployeesError(null);

      const fetched = await employeesService.getAllEmployees();
      setEmployees(fetched.data);
      setInitialized((prev) => ({ ...prev, employees: true }));
      setStatus((prev) => ({
        ...prev,
        employees: { loading: false, error: null, lastInitialized: new Date() },
      }));
      setEmployeesLoading(false);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error loading employees';
      setStatus((prev) => ({
        ...prev,
        employees: { loading: false, error: message, lastInitialized: null },
      }));
      setEmployeesError(message);
      setEmployeesLoading(false);
      return false;
    } finally {
      inFlightRef.current.employees = false;
    }
  }, [
    initialized.employees,
    employeesCount,
    setEmployees,
    setEmployeesLoading,
    setEmployeesError,
  ]);

  const initializeModules = useCallback(
    async (modules: ModuleType[]): Promise<Record<ModuleType, boolean>> => {
      const results = await Promise.allSettled(
        modules.map(async (module) => {
          switch (module) {
            case 'products':
              return { module, success: await initializeProducts() };
            case 'employees':
              return { module, success: await initializeEmployees() };
            default:
              return { module, success: false };
          }
        })
      );

      const resultMap: Record<string, boolean> = {};
      for (const result of results) {
        if (result.status === 'fulfilled') {
          resultMap[result.value.module] = result.value.success;
        } else {
          console.error('Module initialization failed:', result.reason);
        }
      }
      return resultMap as Record<ModuleType, boolean>;
    },
    [initializeProducts, initializeEmployees]
  );

  const forceInitialization = useCallback(
    async (module: ModuleType): Promise<boolean> => {
      setInitialized((prev) => ({ ...prev, [module]: false }));
      switch (module) {
        case 'products':
          setProducts([]);
          return initializeProducts();
        case 'employees':
          setEmployees([]);
          return initializeEmployees();
        default:
          return false;
      }
    },
    [initializeProducts, initializeEmployees, setProducts, setEmployees]
  );

  const getInitializationSummary = useCallback(
    () => ({
      products: {
        initialized: isModuleInitialized('products'),
        count: productsCount,
        status: status.products,
      },
      employees: {
        initialized: isModuleInitialized('employees'),
        count: employeesCount,
        status: status.employees,
      },
    }),
    [isModuleInitialized, productsCount, employeesCount, status]
  );

  return {
    initializeProducts,
    initializeEmployees,
    initializeModules,
    isModuleInitialized,
    getModuleStatus,
    getInitializationSummary,
    forceInitialization,
    initialized,
    status,
  };
}
