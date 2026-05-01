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
      initializeModules(['products', 'employees']);
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

  // Estabilizamos `modules` por su valor (string) para evitar que el caller
  // pase un array inline y dispare el effect en cada render.
  const modulesKey = modules.join(',');
  useEffect(() => {
    if (!allInitialized) {
      initializeModules(modulesKey.split(',') as Array<'products' | 'employees'>);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allInitialized, initializeModules, modulesKey]);

  return {
    isLoading: anyLoading,
    error: anyError ? modules.find(m => moduleStates[m].status.error) : null,
    allReady: allInitialized,
    moduleStates,
  };
}