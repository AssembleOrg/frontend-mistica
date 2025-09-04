import { useState, useCallback } from 'react';
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
 * Designed to work with the Sales page that needs both products and employees.
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

  // Store access
  const { products, setProducts, setLoading: setProductsLoading, setError: setProductsError } = useProductsStore();
  const { employees, setEmployees, setLoading: setEmployeesLoading, setError: setEmployeesError } = useEmployeesStore();

  /**
   * Check if a module is already initialized with data
   */
  const isModuleInitialized = useCallback((module: ModuleType): boolean => {
    switch (module) {
      case 'products':
        return initialized.products || products.length > 0;
      case 'employees':
        return initialized.employees || employees.length > 0;
      default:
        return false;
    }
  }, [initialized, products.length, employees.length]);

  /**
   * Get the status of a specific module
   */
  const getModuleStatus = useCallback((module: ModuleType) => {
    return {
      initialized: isModuleInitialized(module),
      ...status[module],
    };
  }, [isModuleInitialized, status]);

  /**
   * Initialize products if not already loaded
   */
  const initializeProducts = useCallback(async (): Promise<boolean> => {
    if (isModuleInitialized('products')) {
      console.log('🚀 Products already initialized, skipping fetch');
      return true;
    }

    if (status.products.loading) {
      console.log('⏳ Products already loading, waiting...');
      return false;
    }

    try {
      setStatus(prev => ({
        ...prev,
        products: { ...prev.products, loading: true, error: null }
      }));
      
      setProductsLoading(true);
      setProductsError(null);

      console.log('📦 Fetching products...');
      const fetchedProducts = await productsService.getAllProducts();
      
      setProducts(fetchedProducts.data);
      setInitialized(prev => ({ ...prev, products: true }));
      
      setStatus(prev => ({
        ...prev,
        products: { 
          loading: false, 
          error: null, 
          lastInitialized: new Date() 
        }
      }));
      
      setProductsLoading(false);
      console.log(`✅ Products initialized: ${fetchedProducts.data.length} items`);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading products';
      
      setStatus(prev => ({
        ...prev,
        products: { 
          loading: false, 
          error: errorMessage, 
          lastInitialized: null 
        }
      }));
      
      setProductsError(errorMessage);
      setProductsLoading(false);
      
      console.error('❌ Products initialization failed:', errorMessage);
      return false;
    }
  }, [isModuleInitialized, status.products.loading, setProducts, setProductsLoading, setProductsError]);

  /**
   * Initialize employees if not already loaded
   */
  const initializeEmployees = useCallback(async (): Promise<boolean> => {
    if (isModuleInitialized('employees')) {
      console.log('🚀 Employees already initialized, skipping fetch');
      return true;
    }

    if (status.employees.loading) {
      console.log('⏳ Employees already loading, waiting...');
      return false;
    }

    try {
      setStatus(prev => ({
        ...prev,
        employees: { ...prev.employees, loading: true, error: null }
      }));
      
      setEmployeesLoading(true);
      setEmployeesError(null);

      console.log('👥 Fetching employees...');
      const fetchedEmployees = await employeesService.getAllEmployees();
      
      setEmployees(fetchedEmployees.data);
      setInitialized(prev => ({ ...prev, employees: true }));
      
      setStatus(prev => ({
        ...prev,
        employees: { 
          loading: false, 
          error: null, 
          lastInitialized: new Date() 
        }
      }));
      
      setEmployeesLoading(false);
      console.log(`✅ Employees initialized: ${fetchedEmployees.data.length} items`);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error loading employees';
      
      setStatus(prev => ({
        ...prev,
        employees: { 
          loading: false, 
          error: errorMessage, 
          lastInitialized: null 
        }
      }));
      
      setEmployeesError(errorMessage);
      setEmployeesLoading(false);
      
      console.error('❌ Employees initialization failed:', errorMessage);
      return false;
    }
  }, [isModuleInitialized, status.employees.loading, setEmployees, setEmployeesLoading, setEmployeesError]);

  /**
   * Initialize multiple modules in parallel
   * Perfect for Sales page that needs both products and employees
   */
  const initializeModules = useCallback(async (modules: ModuleType[]): Promise<Record<ModuleType, boolean>> => {
    console.log(`🎯 Initializing modules: ${modules.join(', ')}`);
    
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
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        resultMap[result.value.module] = result.value.success;
      } else {
        console.error(`Module initialization failed:`, result.reason);
      }
    });

    return resultMap as Record<ModuleType, boolean>;
  }, [initializeProducts, initializeEmployees]);

  /**
   * Force re-initialization of a module (useful for data refresh)
   */
  const forceInitialization = useCallback(async (module: ModuleType): Promise<boolean> => {
    console.log(`🔄 Force re-initializing ${module}...`);
    
    // Reset initialization state
    setInitialized(prev => ({ ...prev, [module]: false }));
    
    switch (module) {
      case 'products':
        setProducts([]);
        return await initializeProducts();
      case 'employees':
        setEmployees([]);
        return await initializeEmployees();
      default:
        return false;
    }
  }, [initializeProducts, initializeEmployees, setProducts, setEmployees]);

  /**
   * Get initialization summary for debugging
   */
  const getInitializationSummary = useCallback(() => {
    return {
      products: {
        initialized: isModuleInitialized('products'),
        count: products.length,
        status: status.products,
      },
      employees: {
        initialized: isModuleInitialized('employees'),
        count: employees.length,
        status: status.employees,
      },
    };
  }, [isModuleInitialized, products.length, employees.length, status]);

  return {
    // Individual initialization
    initializeProducts,
    initializeEmployees,
    
    // Bulk initialization
    initializeModules,
    
    // Status checks
    isModuleInitialized,
    getModuleStatus,
    getInitializationSummary,
    
    // Force refresh
    forceInitialization,
    
    // Current state
    initialized,
    status,
  };
}