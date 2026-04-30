import { useEffect } from 'react';
import { useAppInitialization } from './useAppInitialization';

/**
 * Smart Products Data Hook
 * 
 * Replacement for useInitialProductsData that uses the centralized initialization system.
 * Prevents duplicate API calls and manages state intelligently.
 */
export function useSmartProductsData() {
  const { 
    initializeProducts, 
    isModuleInitialized, 
    getModuleStatus 
  } = useAppInitialization();

  const isInitialized = isModuleInitialized('products');
  const moduleStatus = getModuleStatus('products');

  useEffect(() => {
    if (!isInitialized) {
      initializeProducts();
    }
  }, [isInitialized, initializeProducts]);

  return {
    isLoading: moduleStatus.loading,
    error: moduleStatus.error,
    isInitialized,
    lastInitialized: moduleStatus.lastInitialized,
  };
}

/**
 * Smart Employees Data Hook
 * 
 * Replacement for useInitialEmployeesData that uses the centralized initialization system.
 * Prevents duplicate API calls and manages state intelligently.
 */
export function useSmartEmployeesData() {
  const { 
    initializeEmployees, 
    isModuleInitialized, 
    getModuleStatus 
  } = useAppInitialization();

  const isInitialized = isModuleInitialized('employees');
  const moduleStatus = getModuleStatus('employees');

  useEffect(() => {
    if (!isInitialized) {
      initializeEmployees();
    }
  }, [isInitialized, initializeEmployees]);

  return {
    isLoading: moduleStatus.loading,
    error: moduleStatus.error,
    isInitialized,
    lastInitialized: moduleStatus.lastInitialized,
  };
}

/**
 * Smart Sales Data Hook
 * 
 * Special hook for Sales page that needs both products and employees.
 * Initializes both modules in parallel and prevents duplicate calls.
 */
export function useSmartSalesData() {
  const { 
    initializeModules, 
    isModuleInitialized, 
    getModuleStatus,
    getInitializationSummary
  } = useAppInitialization();

  const productsInitialized = isModuleInitialized('products');
  const employeesInitialized = isModuleInitialized('employees');
  const bothInitialized = productsInitialized && employeesInitialized;

  const productsStatus = getModuleStatus('products');
  const employeesStatus = getModuleStatus('employees');

  useEffect(() => {
    if (!bothInitialized) {
      console.log('🛒 Sales page initializing required data...');
      initializeModules(['products', 'employees']).then((results) => {
        console.log('🛒 Sales data initialization results:', results);
      });
    } else {
      console.log('🛒 Sales page: All data already available');
    }
  }, [bothInitialized, initializeModules]);

  const isLoading = productsStatus.loading || employeesStatus.loading;
  const hasError = productsStatus.error || employeesStatus.error;
  const error = productsStatus.error || employeesStatus.error;

  return {
    isLoading,
    error: hasError ? error : null,
    productsReady: productsInitialized,
    employeesReady: employeesInitialized,
    allReady: bothInitialized,
    summary: getInitializationSummary(),
  };
}

/**
 * Universal Smart Data Hook
 * 
 * Flexible hook that can initialize any combination of modules.
 * Useful for future pages that might need different data combinations.
 */
export function useSmartData(modules: Array<'products' | 'employees'>) {
  const { 
    initializeModules, 
    isModuleInitialized, 
    getModuleStatus 
  } = useAppInitialization();

  const moduleStates = modules.reduce((acc, module) => {
    acc[module] = {
      initialized: isModuleInitialized(module),
      status: getModuleStatus(module),
    };
    return acc;
  }, {} as Record<string, any>);

  const allInitialized = modules.every(module => moduleStates[module].initialized);
  const anyLoading = modules.some(module => moduleStates[module].status.loading);
  const anyError = modules.some(module => moduleStates[module].status.error);

  useEffect(() => {
    if (!allInitialized) {
      console.log(`🔄 Initializing modules: ${modules.join(', ')}`);
      initializeModules(modules);
    }
  }, [allInitialized, initializeModules, modules]);

  return {
    isLoading: anyLoading,
    error: anyError ? modules.find(m => moduleStates[m].status.error) : null,
    allReady: allInitialized,
    moduleStates,
  };
}