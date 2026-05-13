// services/categories.service.ts

import { apiService, ApiResponse } from './api.service';
import type { Category } from '@/lib/types';

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>;

export class CategoriesService {
  async list(): Promise<ApiResponse<Category[]>> {
    return apiService.get<Category[]>('/categories');
  }

  async create(data: CreateCategoryRequest): Promise<ApiResponse<Category>> {
    return apiService.post<Category>('/categories', data as unknown as Record<string, unknown>);
  }

  async update(id: string, data: UpdateCategoryRequest): Promise<ApiResponse<Category>> {
    return apiService.patch<Category>(`/categories/${id}`, data as unknown as Record<string, unknown>);
  }

  async remove(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/categories/${id}`);
  }
}

export const categoriesService = new CategoriesService();
