/**
 * Utilidades para stores de Zustand más robustos
 * Protección contra race conditions y mejor manejo de estado
 */

import { StateCreator, StoreMutatorIdentifier } from 'zustand';

// Tipo para middleware de transacciones
type TransactionMiddleware = <
  T extends Record<string, any>,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
  U extends Record<string, any> = T
>(
  f: StateCreator<T, Mps, Mcs, U>
) => StateCreator<T, Mps, Mcs, U>;

// Middleware para transacciones atómicas
export const withTransactions: TransactionMiddleware = (f) => (a, b, c) => {
  const store = f(a, b, c);
  
  return {
    ...store,
    // Método para transacciones atómicas
    transaction: (updates: (state: any) => void) => {
      const state = store.getState();
      const newState = { ...state };
      updates(newState);
      store.setState(newState);
    },
    
    // Método para operaciones batch
    batchUpdate: (updates: Partial<any>) => {
      store.setState(updates);
    },
    
    // Método para operaciones condicionales
    conditionalUpdate: (condition: (state: any) => boolean, updates: Partial<any>) => {
      const state = store.getState();
      if (condition(state)) {
        store.setState(updates);
        return true;
      }
      return false;
    }
  };
};

// Middleware para logging de cambios
export const withLogging = <T extends Record<string, any>>(
  f: StateCreator<T>
): StateCreator<T> => (a, b, c) => {
  const store = f(a, b, c);
  
  return {
    ...store,
    setState: (partial: any, replace?: boolean) => {
      const prevState = store.getState();
      const result = store.setState(partial, replace);
      const nextState = store.getState();
      
      // Log solo en desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.group('🔄 Store State Change');
        console.log('Previous:', prevState);
        console.log('Update:', partial);
        console.log('Next:', nextState);
        console.groupEnd();
      }
      
      return result;
    }
  };
};

// Middleware para persistencia con validación
export const withValidation = <T extends Record<string, any>>(
  f: StateCreator<T>,
  validator: (state: T) => boolean | string
): StateCreator<T> => (a, b, c) => {
  const store = f(a, b, c);
  
  return {
    ...store,
    setState: (partial: any, replace?: boolean) => {
      const prevState = store.getState();
      const result = store.setState(partial, replace);
      const nextState = store.getState();
      
      // Validar estado después del cambio
      const validation = validator(nextState);
      if (validation !== true) {
        console.error('❌ Store validation failed:', validation);
        // Revertir cambios si la validación falla
        store.setState(prevState, true);
        throw new Error(`Store validation failed: ${validation}`);
      }
      
      return result;
    }
  };
};

// Middleware para debounce de operaciones
export const withDebounce = <T extends Record<string, any>>(
  f: StateCreator<T>,
  delay: number = 300
): StateCreator<T> => (a, b, c) => {
  const store = f(a, b, c);
  let timeoutId: NodeJS.Timeout;
  
  return {
    ...store,
    setState: (partial: any, replace?: boolean) => {
      clearTimeout(timeoutId);
      
      return new Promise((resolve) => {
        timeoutId = setTimeout(() => {
          const result = store.setState(partial, replace);
          resolve(result);
        }, delay);
      });
    }
  };
};

// Utilidad para crear stores con múltiples middlewares
export const createRobustStore = <T extends Record<string, any>>(
  initialState: T,
  middlewares: Array<(f: StateCreator<T>) => StateCreator<T>> = []
) => {
  let storeCreator: StateCreator<T> = (set, get, api) => ({
    ...initialState,
    setState: set,
    getState: get,
    subscribe: api.subscribe,
  });
  
  // Aplicar middlewares en orden
  middlewares.forEach(middleware => {
    storeCreator = middleware(storeCreator);
  });
  
  return storeCreator;
};

// Utilidad para operaciones seguras en stores
export const safeStoreOperation = <T, R>(
  operation: () => R,
  fallback: R,
  errorHandler?: (error: Error) => void
): R => {
  try {
    return operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Store operation failed:', errorMessage);
    
    if (errorHandler) {
      errorHandler(error instanceof Error ? error : new Error(errorMessage));
    }
    
    return fallback;
  }
};

// Utilidad para operaciones asíncronas seguras
export const safeAsyncStoreOperation = async <T, R>(
  operation: () => Promise<R>,
  fallback: R,
  errorHandler?: (error: Error) => void
): Promise<R> => {
  try {
    return await operation();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Async store operation failed:', errorMessage);
    
    if (errorHandler) {
      errorHandler(error instanceof Error ? error : new Error(errorMessage));
    }
    
    return fallback;
  }
};

// Utilidad para crear selectores memoizados
export const createSelector = <T, R>(
  selector: (state: T) => R,
  dependencies: (keyof T)[] = []
) => {
  let lastState: Partial<T> = {};
  let lastResult: R;
  
  return (state: T): R => {
    // Verificar si las dependencias cambiaron
    const hasChanged = dependencies.some(dep => 
      lastState[dep] !== state[dep]
    );
    
    if (hasChanged || lastResult === undefined) {
      lastState = Object.fromEntries(
        dependencies.map(dep => [dep, state[dep]])
      );
      lastResult = selector(state);
    }
    
    return lastResult;
  };
};

// Utilidad para crear acciones con rollback
export const createRollbackAction = <T>(
  store: { getState: () => T; setState: (state: T) => void },
  action: (state: T) => Partial<T>
) => {
  return () => {
    const currentState = store.getState();
    const backup = { ...currentState };
    
    try {
      const updates = action(currentState);
      const newState = { ...currentState, ...updates };
      store.setState(newState);
      return true;
    } catch (error) {
      // Rollback en caso de error
      store.setState(backup);
      console.error('Action failed, state rolled back:', error);
      return false;
    }
  };
};

// Exportar tipos útiles
export type { TransactionMiddleware }; 