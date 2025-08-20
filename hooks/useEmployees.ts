/**
 * Simple Employees Hook - KISS MVP
 */

import { useCallback } from 'react';
import { useAppStore } from '@/stores/app.store';
import { Employee, EmployeeCreationData } from '@/lib/types';

export function useEmployees() {
  const { 
    employees, 
    addEmployee, 
    updateEmployee, 
    deleteEmployee 
  } = useAppStore();

  const createEmployee = useCallback((data: EmployeeCreationData) => {
    // Simple validation
    if (!data.name.trim()) throw new Error('El nombre del empleado es requerido');
    if (!data.email.trim()) throw new Error('El email es requerido');
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) throw new Error('El email no es válido');

    // Check for duplicate emails
    const existingEmployee = employees.find(e => e.email.toLowerCase() === data.email.toLowerCase());
    if (existingEmployee) throw new Error('Ya existe un empleado con este email');

    const newEmployee: Employee = {
      id: crypto.randomUUID(),
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role,
      phone: data.phone?.trim(),
      address: data.address?.trim(),
      startDate: data.startDate,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    addEmployee(newEmployee);
    return newEmployee;
  }, [employees, addEmployee]);

  const searchEmployees = useCallback((query: string, role?: string) => {
    let filteredEmployees = employees;
    
    // Filter by role if specified
    if (role && role !== 'all') {
      filteredEmployees = filteredEmployees.filter(employee => employee.role === role);
    }
    
    // If no query, return filtered employees
    if (!query.trim()) return filteredEmployees;
    
    // Apply text search
    const searchTerm = query.toLowerCase();
    return filteredEmployees.filter(employee =>
      employee.name.toLowerCase().includes(searchTerm) ||
      employee.email.toLowerCase().includes(searchTerm) ||
      (employee.phone && employee.phone.includes(searchTerm))
    );
  }, [employees]);

  const getEmployeeById = useCallback((id: string) => {
    return employees.find(e => e.id === id);
  }, [employees]);

  const getEmployeeByEmail = useCallback((email: string) => {
    return employees.find(e => e.email.toLowerCase() === email.toLowerCase());
  }, [employees]);

  const stats = {
    total: employees.length,
    byRole: {
      gerente: employees.filter(e => e.role === 'gerente').length,
      cajero: employees.filter(e => e.role === 'cajero').length
    }
  };

  return {
    employees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
    getEmployeeById,
    getEmployeeByEmail,
    stats
  };
}