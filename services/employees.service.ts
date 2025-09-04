// services/employees.service.ts

import { apiService, ApiResponse } from './api.service';
import type { paths } from '@/lib/api-types';
import type { Employee } from '@/lib/types';

// Extract types from OpenAPI schema
type CreateEmployeeRequest = paths['/employees']['post']['requestBody']['content']['application/json'];
type UpdateEmployeeRequest = paths['/employees/{id}']['patch']['requestBody']['content']['application/json'];

// Paginated response interface
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class EmployeesService {
  // Get all employees with pagination
  async getEmployees(page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Employee>>> {
    return apiService.getPaginated<PaginatedResponse<Employee>>('/employees', page, limit);
  }

  // Get all employees without pagination
  async getAllEmployees(): Promise<ApiResponse<Employee[]>> {
    return apiService.get<Employee[]>('/employees/all');
  }

  // Get single employee by ID
  async getEmployee(id: string): Promise<ApiResponse<Employee>> {
    return apiService.get<Employee>(`/employees/${id}`);
  }

  // Helper to clean payload - remove empty fields
  private cleanPayload(data: Record<string, unknown>): Record<string, unknown> {
    const cleaned = { ...data };
    
    // Remove empty optional fields
    if (!cleaned.phone || (typeof cleaned.phone === 'string' && cleaned.phone.trim() === '')) {
      delete cleaned.phone;
    }
    
    if (!cleaned.address || (typeof cleaned.address === 'string' && cleaned.address.trim() === '')) {
      delete cleaned.address;
    }
    
    return cleaned;
  }

  // Create new employee
  async createEmployee(employeeData: CreateEmployeeRequest): Promise<ApiResponse<Employee>> {
    const cleanedData = this.cleanPayload(employeeData);
    return apiService.post<Employee>('/employees', cleanedData);
  }

  // Update existing employee
  async updateEmployee(id: string, updates: UpdateEmployeeRequest): Promise<ApiResponse<Employee>> {
    const cleanedUpdates = this.cleanPayload(updates);
    return apiService.patch<Employee>(`/employees/${id}`, cleanedUpdates);
  }

  // Delete employee (soft delete)
  async deleteEmployee(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/employees/${id}`);
  }

  // Search employees by multiple criteria (if backend supports it)
  async searchEmployees(
    query: string,
    role?: Employee['role'],
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Employee>>> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (role) {
      params.append('role', role);
    }

    return apiService.get<PaginatedResponse<Employee>>(`/employees/search?${params.toString()}`);
  }

  // Get employees by role
  async getEmployeesByRole(
    role: Employee['role'],
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Employee>>> {
    const params = new URLSearchParams({
      role: role,
      page: page.toString(),
      limit: limit.toString(),
    });

    return apiService.get<PaginatedResponse<Employee>>(`/employees/role?${params.toString()}`);
  }

  // Get employee statistics
  async getEmployeeStats(): Promise<ApiResponse<{
    totalEmployees: number;
    employeesByRole: Record<Employee['role'], number>;
    newEmployeesThisMonth: number;
    activeEmployees: number;
  }>> {
    return apiService.get('/employees/stats');
  }

  // Bulk operations
  async bulkUpdateEmployees(updates: Array<{ id: string; updates: Partial<Employee> }>): Promise<ApiResponse<Employee[]>> {
    return apiService.patch<Employee[]>('/employees/bulk/update', { updates });
  }

  async bulkDeleteEmployees(employeeIds: string[]): Promise<ApiResponse<{ message: string; deletedCount: number }>> {
    return apiService.delete<{ message: string; deletedCount: number }>('/employees/bulk/delete', {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate email uniqueness
  async validateEmail(email: string, excludeEmployeeId?: string): Promise<ApiResponse<{ isUnique: boolean }>> {
    const params = new URLSearchParams({ email });
    if (excludeEmployeeId) {
      params.append('exclude', excludeEmployeeId);
    }

    return apiService.get<{ isUnique: boolean }>(`/employees/validate/email?${params.toString()}`);
  }

  // Get employee history/audit trail (if backend supports it)
  async getEmployeeHistory(employeeId: string): Promise<ApiResponse<Array<{
    id: string;
    employeeId: string;
    action: 'created' | 'updated' | 'deleted' | 'role_changed';
    changes: Record<string, any>;
    userId: string;
    timestamp: string;
  }>>> {
    return apiService.get(`/employees/${employeeId}/history`);
  }

  // Calculate employee tenure
  calculateTenure(employee: Employee): {
    years: number;
    months: number;
    days: number;
    totalDays: number;
  } {
    const startDate = new Date(employee.startDate);
    const currentDate = new Date();
    
    let years = currentDate.getFullYear() - startDate.getFullYear();
    let months = currentDate.getMonth() - startDate.getMonth();
    let days = currentDate.getDate() - startDate.getDate();

    if (days < 0) {
      months--;
      days += new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const totalDays = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return { years, months, days, totalDays };
  }

  // Format employee for display
  formatEmployeeForDisplay(employee: Employee): Employee & {
    displayName: string;
    roleLabel: string;
    tenureText: string;
  } {
    const tenure = this.calculateTenure(employee);
    const roleLabels = {
      'cajero': 'Cajero/a',
      'gerente': 'Gerente',
      'mozo': 'Mozo/a'
    };

    let tenureText = '';
    if (tenure.years > 0) {
      tenureText = `${tenure.years} año${tenure.years > 1 ? 's' : ''}`;
      if (tenure.months > 0) {
        tenureText += ` y ${tenure.months} mes${tenure.months > 1 ? 'es' : ''}`;
      }
    } else if (tenure.months > 0) {
      tenureText = `${tenure.months} mes${tenure.months > 1 ? 'es' : ''}`;
    } else {
      tenureText = `${tenure.days} día${tenure.days !== 1 ? 's' : ''}`;
    }

    return {
      ...employee,
      displayName: employee.name,
      roleLabel: roleLabels[employee.role] || employee.role,
      tenureText
    };
  }

  // Get employees starting this month
  async getNewEmployeesThisMonth(): Promise<ApiResponse<Employee[]>> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const params = new URLSearchParams({
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0],
    });

    return apiService.get<Employee[]>(`/employees/new-this-month?${params.toString()}`);
  }

  // Upload employee photo (if backend supports file upload)
  async uploadEmployeePhoto(employeeId: string, photoFile: File): Promise<ApiResponse<{ photoUrl: string }>> {
    const formData = new FormData();
    formData.append('photo', photoFile);
    
    // Note: This would require a different implementation in apiService for multipart/form-data
    const response = await fetch(`${apiService['baseURL']}/employees/${employeeId}/photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiService['getAuthToken']()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      data: data.data || data,
      status: response.status,
      message: data.message || 'Photo uploaded successfully',
    };
  }
}

// Export singleton instance
export const employeesService = new EmployeesService();

// Export types for external use
export type { CreateEmployeeRequest, UpdateEmployeeRequest, PaginatedResponse };