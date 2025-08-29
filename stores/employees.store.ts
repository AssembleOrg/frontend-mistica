// stores/employees.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Employee } from '@/lib/types';

// Loading state interface
interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Employees store state
interface EmployeesState {
  // Data
  employees: Employee[];
  selectedEmployee: Employee | null;
  
  // UI State
  loading: LoadingState;
  searchQuery: string;
  selectedRole: Employee['role'] | 'all';
  sortBy: 'name' | 'email' | 'role' | 'startDate';
  sortOrder: 'asc' | 'desc';
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  
  // Synchronous actions (only state updates, no API calls)
  setEmployees: (employees: Employee[]) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  removeEmployee: (id: string) => void;
  
  // UI Actions
  setSelectedEmployee: (employee: Employee | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedRole: (role: Employee['role'] | 'all') => void;
  setSortBy: (sortBy: 'name' | 'email' | 'role' | 'startDate') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  
  // Pagination Actions
  setPagination: (pagination: Partial<EmployeesState['pagination']>) => void;
  nextPage: () => void;
  prevPage: () => void;
  
  // Computed/Selectors (pure functions)
  getFilteredEmployees: () => Employee[];
  getSortedEmployees: (employees: Employee[]) => Employee[];
  getEmployeesByRole: (role: Employee['role']) => Employee[];
  getEmployeeStats: () => {
    total: number;
    byRole: Record<Employee['role'], number>;
    newThisMonth: number;
    avgTenure: number;
  };
  getRecentEmployees: (limit?: number) => Employee[];
  
  // Utility Actions
  clearError: () => void;
  reset: () => void;
}

// Helper function to calculate tenure in months
const calculateTenureInMonths = (startDate: Date | string): number => {
  const start = new Date(startDate);
  const now = new Date();
  
  const years = now.getFullYear() - start.getFullYear();
  const months = now.getMonth() - start.getMonth();
  
  return years * 12 + months;
};

// Helper function to check if employee started this month
const isNewThisMonth = (startDate: Date | string): boolean => {
  const start = new Date(startDate);
  const now = new Date();
  
  return start.getFullYear() === now.getFullYear() && 
         start.getMonth() === now.getMonth();
};

// Initial state
const initialState = {
  employees: [],
  selectedEmployee: null,
  loading: { isLoading: false, error: null },
  searchQuery: '',
  selectedRole: 'all' as const,
  sortBy: 'name' as const,
  sortOrder: 'asc' as const,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

export const useEmployeesStore = create<EmployeesState>()(
  persist(
    (set, get) => ({
      // Initial State
      ...initialState,

      // Synchronous Actions - Only update state, no side effects
      setEmployees: (employees) => {
        set((state) => ({
          employees,
          pagination: {
            ...state.pagination,
            total: employees.length,
            totalPages: Math.ceil(employees.length / state.pagination.limit),
          },
        }));
      },

      addEmployee: (employee) => {
        set((state) => ({
          employees: [...state.employees, employee],
        }));
      },

      updateEmployee: (id, updates) => {
        set((state) => ({
          employees: state.employees.map((employee) =>
            employee.id === id ? { ...employee, ...updates } : employee
          ),
          selectedEmployee:
            state.selectedEmployee?.id === id
              ? { ...state.selectedEmployee, ...updates }
              : state.selectedEmployee,
        }));
      },

      removeEmployee: (id) => {
        set((state) => ({
          employees: state.employees.filter((employee) => employee.id !== id),
          selectedEmployee:
            state.selectedEmployee?.id === id ? null : state.selectedEmployee,
        }));
      },

      // UI Actions
      setSelectedEmployee: (employee) => {
        set({ selectedEmployee: employee });
      },

      setLoading: (isLoading) => {
        set((state) => ({
          loading: { ...state.loading, isLoading },
        }));
      },

      setError: (error) => {
        set((state) => ({
          loading: { ...state.loading, error },
        }));
      },

      setSearchQuery: (searchQuery) => {
        set({ searchQuery });
      },

      setSelectedRole: (selectedRole) => {
        set({ selectedRole });
      },

      setSortBy: (sortBy) => {
        set({ sortBy });
      },

      setSortOrder: (sortOrder) => {
        set({ sortOrder });
      },

      // Pagination Actions
      setPagination: (pagination) => {
        set((state) => ({
          pagination: { ...state.pagination, ...pagination },
        }));
      },

      nextPage: () => {
        set((state) => {
          const nextPage = Math.min(
            state.pagination.page + 1,
            state.pagination.totalPages
          );
          return {
            pagination: { ...state.pagination, page: nextPage },
          };
        });
      },

      prevPage: () => {
        set((state) => {
          const prevPage = Math.max(state.pagination.page - 1, 1);
          return {
            pagination: { ...state.pagination, page: prevPage },
          };
        });
      },

      // Computed/Selectors
      getFilteredEmployees: () => {
        const { employees, searchQuery, selectedRole } = get();
        
        let filtered = [...employees];
        
        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter((employee) =>
            employee.name.toLowerCase().includes(query) ||
            employee.email.toLowerCase().includes(query) ||
            employee.phone?.toLowerCase().includes(query) ||
            employee.address?.toLowerCase().includes(query)
          );
        }
        
        // Filter by role
        if (selectedRole !== 'all') {
          filtered = filtered.filter((employee) => employee.role === selectedRole);
        }
        
        return filtered;
      },

      getSortedEmployees: (employees) => {
        const { sortBy, sortOrder } = get();
        
        return [...employees].sort((a, b) => {
          let aVal: any = a[sortBy];
          let bVal: any = b[sortBy];
          
          // Handle date comparison for startDate
          if (sortBy === 'startDate') {
            aVal = new Date(aVal).getTime();
            bVal = new Date(bVal).getTime();
          }
          
          // Handle string comparison
          if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
          }
          
          let result = 0;
          if (aVal < bVal) result = -1;
          if (aVal > bVal) result = 1;
          
          return sortOrder === 'desc' ? -result : result;
        });
      },

      getEmployeesByRole: (role) => {
        const { employees } = get();
        return employees.filter((employee) => employee.role === role);
      },

      getEmployeeStats: () => {
        const { employees } = get();
        
        if (employees.length === 0) {
          return {
            total: 0,
            byRole: { cajero: 0, gerente: 0, mozo: 0 } as Record<Employee['role'], number>,
            newThisMonth: 0,
            avgTenure: 0,
          };
        }
        
        // Count by role
        const byRole = employees.reduce((acc, employee) => {
          acc[employee.role] = (acc[employee.role] || 0) + 1;
          return acc;
        }, {} as Record<Employee['role'], number>);
        
        // Ensure all roles have a count
        const roleStats: Record<Employee['role'], number> = {
          cajero: byRole.cajero || 0,
          gerente: byRole.gerente || 0,
          mozo: byRole.mozo || 0,
        };
        
        // Count new employees this month
        const newThisMonth = employees.filter((employee) =>
          isNewThisMonth(employee.startDate)
        ).length;
        
        // Calculate average tenure in months
        const totalTenure = employees.reduce((sum, employee) => 
          sum + calculateTenureInMonths(employee.startDate), 0
        );
        const avgTenure = Math.round(totalTenure / employees.length * 10) / 10;
        
        return {
          total: employees.length,
          byRole: roleStats,
          newThisMonth,
          avgTenure,
        };
      },

      getRecentEmployees: (limit = 5) => {
        const { employees } = get();
        return [...employees]
          .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
          .slice(0, limit);
      },

      // Utility Actions
      clearError: () => {
        set((state) => ({
          loading: { ...state.loading, error: null },
        }));
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'mistica-employees-storage',
      // Only persist essential data, not UI state
      partialize: (state) => ({
        employees: state.employees,
        selectedEmployee: state.selectedEmployee,
      }),
      // Skip persisting loading states and UI preferences
      skipHydration: false,
    }
  )
);