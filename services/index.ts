// services/index.ts - Exports centralizados

export { apiService, ApiService } from './api.service';
export { authService, AuthService } from './auth.service';
export { productsService, ProductsService } from './products.service';
export { appService, AppService } from './app.service';

export type { ApiResponse, ApiError } from './api.service';
export type { AuthResponse, User, LoginRequest, RegisterRequest } from './auth.service';
export type { CreateProductRequest, UpdateProductRequest, PaginatedResponse } from './products.service';
export type { HealthResponse, DatabaseInfoResponse } from './app.service';