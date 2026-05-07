/**
 * Employees Hook - Backend Integration Ready
 * Now supports async operations, error handling, and loading states
 */

import { useCallback, useRef, useState, useMemo } from 'react';
import { useEmployeesStore } from '@/stores/employees.store';
import { employeesService, CreateEmployeeRequest, UpdateEmployeeRequest } from '@/services/employees.service';
import { ApiError } from '@/services/api.service';
import type { Employee } from '@/lib/types';
import { showToast } from '@/lib/toast';
import { log } from '@/lib/logger';

// Hook state interface
interface UseEmployeesState {
  loading: boolean;
  error: string | null;
  syncing: boolean; // For background sync operations
}

export function useEmployees() {
  const store = useEmployeesStore();
  const [state, setState] = useState<UseEmployeesState>({
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

  // No automatic fetching - use useInitialEmployeesData hook instead

  // Fetch all employees from API with stable reference
  const fetchEmployees = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    storeRef.current.setLoading(true);
    
    try {
      log.debug('👥 EMPLEADOS: Llamando a employeesService.getAllEmployees()');
      const response = await employeesService.getAllEmployees();
      log.debug('👥 EMPLEADOS: Respuesta recibida:', response);

      storeRef.current.setEmployees(response.data);
      setState(prev => ({ ...prev, loading: false }));
      storeRef.current.setLoading(false);
      log.debug('👥 EMPLEADOS: Empleados guardados en store:', response.data.length);
    } catch (error) {
      handleApiError(error, 'cargar empleados');
      setState(prev => ({ ...prev, loading: false }));
      storeRef.current.setLoading(false);
    }
  }, [handleApiError]);

  // Create employee (async) with stable reference
  const createEmployee = useCallback(async (data: CreateEmployeeRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      log.debug('👥 EMPLEADOS: Creando empleado:', data);
      const response = await employeesService.createEmployee(data);
      log.debug('👥 EMPLEADOS: Empleado creado:', response.data);
      
      storeRef.current.addEmployee(response.data);
      
      showToast.success('Empleado creado exitosamente');
      setState(prev => ({ ...prev, loading: false }));
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'crear empleado');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [handleApiError]);

  // Update employee (async) with stable reference
  const updateEmployee = useCallback(async (id: string, updates: UpdateEmployeeRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      log.debug('👥 EMPLEADOS: Actualizando empleado:', id, updates);
      const response = await employeesService.updateEmployee(id, updates);
      log.debug('👥 EMPLEADOS: Empleado actualizado:', response.data);
      
      storeRef.current.updateEmployee(id, response.data);
      
      showToast.success('Empleado actualizado exitosamente');
      setState(prev => ({ ...prev, loading: false }));
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'actualizar empleado');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [handleApiError]);

  // Delete employee (async) with stable reference
  const deleteEmployee = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      log.debug('👥 EMPLEADOS: Eliminando empleado:', id);
      await employeesService.deleteEmployee(id);
      log.debug('👥 EMPLEADOS: Empleado eliminado exitosamente');
      
      storeRef.current.removeEmployee(id);
      
      showToast.success('Empleado eliminado exitosamente');
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      handleApiError(error, 'eliminar empleado');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [handleApiError]);

  // Search employees setters (no state change during render)
  const setSearchQuery = useCallback((query: string) => {
    storeRef.current.setSearchQuery(query);
  }, []);

  const setSelectedRole = useCallback((role: Employee['role'] | 'all') => {
    storeRef.current.setSelectedRole(role);
  }, []);

  // Get employee by ID (async from API if needed) with stable reference
  const getEmployee = useCallback(async (id: string) => {
    const localEmployee = storeRef.current.employees.find(e => e.id === id);
    if (localEmployee) {
      log.debug('👥 EMPLEADOS: Empleado encontrado en store local:', localEmployee);
      return localEmployee;
    }
    
    try {
      const response = await employeesService.getEmployee(id);
      return response.data;
    } catch (error) {
      handleApiError(error, 'obtener empleado');
      return null;
    }
  }, [handleApiError]);

  // Get employee by ID (sync from local store only) - for backward compatibility
  const getEmployeeById = useCallback((id: string) => {
    return storeRef.current.employees.find(e => e.id === id);
  }, []);

  // Get employee by email (sync from local store only)
  const getEmployeeByEmail = useCallback((email: string) => {
    return storeRef.current.employees.find(e => e.email.toLowerCase() === email.toLowerCase());
  }, []);

  // Get employees by role (async)
  const getEmployeesByRole = useCallback(async (role: Employee['role'], page = 1, limit = 20) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      log.debug('👥 EMPLEADOS: Obteniendo empleados por rol:', role);
      const response = await employeesService.getEmployeesByRole(role, page, limit);
      log.debug('👥 EMPLEADOS: Empleados por rol obtenidos:', response.data);
      setState(prev => ({ ...prev, loading: false }));
      return response.data;
    } catch (error) {
      handleApiError(error, 'obtener empleados por rol');
      setState(prev => ({ ...prev, loading: false }));
      return null;
    }
  }, [handleApiError]);

  // Get employee statistics (async)
  const fetchEmployeeStats = useCallback(async () => {
    setState(prev => ({ ...prev, syncing: true }));
    
    try {
      log.debug('👥 EMPLEADOS: Obteniendo estadísticas de empleados');
      const response = await employeesService.getEmployeeStats();
      log.debug('👥 EMPLEADOS: Estadísticas obtenidas:', response.data);
      setState(prev => ({ ...prev, syncing: false }));
      return response.data;
    } catch (error) {
      handleApiError(error, 'obtener estadísticas de empleados');
      setState(prev => ({ ...prev, syncing: false }));
      return null;
    }
  }, [handleApiError]);

  // Validate email uniqueness
  const validateEmail = useCallback(async (email: string, excludeEmployeeId?: string) => {
    try {
      log.debug('👥 EMPLEADOS: Validando email único:', email);
      const response = await employeesService.validateEmail(email, excludeEmployeeId);
      log.debug('👥 EMPLEADOS: Validación de email:', response.data);
      return response.data.isUnique;
    } catch (error) {
      handleApiError(error, 'validar email');
      return false;
    }
  }, [handleApiError]);

  // Upload employee photo
  const uploadPhoto = useCallback(async (employeeId: string, photoFile: File) => {
    setState(prev => ({ ...prev, syncing: true }));
    
    try {
      log.debug('👥 EMPLEADOS: Subiendo foto para empleado:', employeeId);
      const response = await employeesService.uploadEmployeePhoto(employeeId, photoFile);
      log.debug('👥 EMPLEADOS: Foto subida exitosamente:', response.data);
      
      // Update employee with photo URL
      storeRef.current.updateEmployee(employeeId, { 
        // Note: This assumes the Employee type will have a photo field in the future
        // photoUrl: response.data.photoUrl 
      });
      
      showToast.success('Foto subida exitosamente');
      setState(prev => ({ ...prev, syncing: false }));
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'subir foto');
      setState(prev => ({ ...prev, syncing: false }));
      throw error;
    }
  }, [handleApiError]);

  // Bulk operations
  const bulkDeleteEmployees = useCallback(async (employeeIds: string[]) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      log.debug('👥 EMPLEADOS: Eliminación masiva de empleados:', employeeIds);
      await employeesService.bulkDeleteEmployees(employeeIds);
      log.debug('👥 EMPLEADOS: Eliminación masiva completada');
      
      // Remove employees from store
      employeeIds.forEach(id => storeRef.current.removeEmployee(id));
      
      showToast.success(`${employeeIds.length} empleados eliminados exitosamente`);
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      handleApiError(error, 'eliminar empleados');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [handleApiError]);

  // Clear error with stable reference
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    storeRef.current.clearError();
  }, []);

  // Computed values from store with stable references
  const filteredEmployees = useMemo(() => store.getFilteredEmployees(), [store.employees, store.searchQuery, store.selectedRole]);
  const sortedEmployees = useMemo(() => store.getSortedEmployees(filteredEmployees), [filteredEmployees, store.sortBy, store.sortOrder]);
  const recentEmployees = useMemo(() => store.getRecentEmployees(), [store.employees]);
  const stats = useMemo(() => store.getEmployeeStats(), [store.employees]);

  return {
    // Data
    employees: store.employees,
    filteredEmployees,
    sortedEmployees,
    selectedEmployee: store.selectedEmployee,
    recentEmployees,
    
    // State
    loading: state.loading || store.loading.isLoading,
    error: state.error || store.loading.error,
    syncing: state.syncing,
    
    // Actions
    fetchEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployee,
    getEmployeeById,
    getEmployeeByEmail,
    getEmployeesByRole,
    bulkDeleteEmployees,
    
    // Search & Filter
    setSearchQuery,
    setSelectedRole,
    setSortBy: store.setSortBy,
    setSortOrder: store.setSortOrder,
    
    // Async operations
    fetchEmployeeStats,
    validateEmail,
    uploadPhoto,
    
    // Selectors
    stats,
    
    // UI
    setSelectedEmployee: store.setSelectedEmployee,
    clearError,
    
    // Store state
    searchQuery: store.searchQuery,
    selectedRole: store.selectedRole,
    sortBy: store.sortBy,
    sortOrder: store.sortOrder,
    pagination: store.pagination,
  };
}