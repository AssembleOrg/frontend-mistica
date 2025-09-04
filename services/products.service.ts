// services/products.service.ts

import { apiService, ApiResponse } from './api.service';
import type { paths } from '@/lib/api-types';
import type { Product, ProductCategory } from '@/lib/types';

// Extract types from OpenAPI schema
type CreateProductRequest = paths['/products']['post']['requestBody']['content']['application/json'];
type UpdateProductRequest = paths['/products/{id}']['patch']['requestBody']['content']['application/json'];

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

// Stock operation request
interface StockOperation {
  quantity: number;
  reason?: string;
}

export class ProductsService {
  // Get all products with pagination
  async getProducts(page: number = 1, limit: number = 10): Promise<ApiResponse<PaginatedResponse<Product>>> {
    return apiService.getPaginated<PaginatedResponse<Product>>('/products', page, limit);
  }

  // Get all products without pagination
  async getAllProducts(): Promise<ApiResponse<Product[]>> {
    console.log('🏭 PRODUCTS SERVICE: Llamando a GET /products/all');
    const response = await apiService.get<Product[]>('/products/all');
    console.log('🏭 PRODUCTS SERVICE: Respuesta recibida:', response.data?.length, 'productos');
    return response;
  }

  // Get single product by ID
  async getProduct(id: string): Promise<ApiResponse<Product>> {
    return apiService.get<Product>(`/products/${id}`);
  }

  // Get products by category
  async getProductsByCategory(
    category: ProductCategory,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Product>>> {
    return apiService.getPaginated<PaginatedResponse<Product>>(
      `/products/category/${category}`,
      page,
      limit
    );
  }

  // Helper to clean payload and add required fields
  private cleanPayload(data: Record<string, unknown>): Record<string, unknown> {
    const cleaned = { ...data };
    
    // Remove undefined fields (backend doesn't accept undefined values)
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });
    
    // Add required fields with defaults if missing
    if (!cleaned.image) {
      cleaned.image = 'https://via.placeholder.com/300x300/e5e7eb/9ca3af?text=Sin+Imagen';
    }
    
    // Ensure description is not empty (backend might require non-empty string)
    if (!cleaned.description || (typeof cleaned.description === 'string' && cleaned.description.trim() === '')) {
      cleaned.description = 'Sin descripción';
    }
    
    return cleaned;
  }

  // Create new product
  async createProduct(productData: CreateProductRequest): Promise<ApiResponse<Product>> {
    console.log('🏭 PRODUCTS SERVICE: Creando producto:', productData.name);
    const cleanedData = this.cleanPayload(productData);
    const response = await apiService.post<Product>('/products', cleanedData);
    console.log('🏭 PRODUCTS SERVICE: Producto creado:', response.data.name);
    return response;
  }

  // Update existing product
  async updateProduct(id: string, updates: UpdateProductRequest): Promise<ApiResponse<Product>> {
    const cleanedUpdates = this.cleanPayload(updates);
    return apiService.patch<Product>(`/products/${id}`, cleanedUpdates);
  }

  // Delete product (soft delete)
  async deleteProduct(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/products/${id}`);
  }

  // Add stock to product
  async addStock(id: string, quantity: number): Promise<ApiResponse<Product>> {
    console.log('🏭 PRODUCTS SERVICE: Agregando stock:', quantity, 'al producto:', id);
    const response = await apiService.patch<Product>(`/products/${id}/stock/add`, { quantity });
    console.log('🏭 PRODUCTS SERVICE: Stock actualizado:', response.data.stock);
    return response;
  }

  // Subtract stock from product
  async subtractStock(id: string, quantity: number): Promise<ApiResponse<Product>> {
    console.log('🏭 PRODUCTS SERVICE: Restando stock:', quantity, 'del producto:', id);
    const response = await apiService.patch<Product>(`/products/${id}/stock/subtract`, { quantity });
    console.log('🏭 PRODUCTS SERVICE: Stock actualizado:', response.data.stock);
    return response;
  }

  // Bulk operations
  async bulkUpdateStock(updates: Array<{ id: string; stock: number }>): Promise<ApiResponse<Product[]>> {
    return apiService.patch<Product[]>('/products/bulk/stock', { updates });
  }

  async bulkUpdatePrices(updates: Array<{ id: string; price: number; costPrice?: number }>): Promise<ApiResponse<Product[]>> {
    return apiService.patch<Product[]>('/products/bulk/prices', { updates });
  }

  // Search products (if backend supports it)
  async searchProducts(
    query: string,
    category?: ProductCategory,
    page: number = 1,
    limit: number = 10
  ): Promise<ApiResponse<PaginatedResponse<Product>>> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (category) {
      params.append('category', category);
    }

    return apiService.get<PaginatedResponse<Product>>(`/products/search?${params.toString()}`);
  }

  // Get products with low stock
  async getLowStockProducts(threshold: number = 10): Promise<ApiResponse<Product[]>> {
    const params = new URLSearchParams({
      threshold: threshold.toString(),
    });

    return apiService.get<Product[]>(`/products/low-stock?${params.toString()}`);
  }

  // Get product statistics
  async getProductStats(): Promise<ApiResponse<{
    totalProducts: number;
    totalStock: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    categoryBreakdown: Record<ProductCategory, number>;
  }>> {
    return apiService.get('/products/stats');
  }

  // Upload product image (if backend supports file upload)
  async uploadProductImage(productId: string, imageFile: File): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    // Note: This would require a different implementation in apiService for multipart/form-data
    const response = await fetch(`${apiService['baseURL']}/products/${productId}/image`, {
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
      message: data.message || 'Image uploaded successfully',
    };
  }

  // Get product history/audit trail (if backend supports it)
  async getProductHistory(productId: string): Promise<ApiResponse<Array<{
    id: string;
    productId: string;
    action: 'created' | 'updated' | 'stock_added' | 'stock_subtracted' | 'deleted';
    changes: Record<string, any>;
    userId: string;
    timestamp: string;
  }>>> {
    return apiService.get(`/products/${productId}/history`);
  }

  // Validate barcode uniqueness
  async validateBarcode(barcode: string, excludeProductId?: string): Promise<ApiResponse<{ isUnique: boolean }>> {
    const params = new URLSearchParams({ barcode });
    if (excludeProductId) {
      params.append('exclude', excludeProductId);
    }

    return apiService.get<{ isUnique: boolean }>(`/products/validate/barcode?${params.toString()}`);
  }

  // Calculate profit margins
  calculateProfitMargin(product: Product): number {
    if (product.costPrice <= 0) return 0;
    return ((product.price - product.costPrice) / product.costPrice) * 100;
  }

  // Calculate potential profit
  calculatePotentialProfit(product: Product): number {
    return (product.price - product.costPrice) * product.stock;
  }
}

// Export singleton instance
export const productsService = new ProductsService();

// Export types for external use
export type { CreateProductRequest, UpdateProductRequest, StockOperation, PaginatedResponse };