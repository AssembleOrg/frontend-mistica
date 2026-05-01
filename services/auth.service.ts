// services/auth.service.ts

import { apiService, ApiResponse } from './api.service';
import type { paths } from '@/lib/api-types';

// Extract types from OpenAPI schema
type LoginRequest = paths['/auth/login']['post']['requestBody']['content']['application/json'];
type RegisterRequest = paths['/auth/register']['post']['requestBody']['content']['application/json'];
type AdminRegisterRequest = paths['/auth/admin/register']['post']['requestBody']['content']['application/json'];

// Response del login: el `access_token` ya no se devuelve en el body — se
// setea como cookie httpOnly desde el backend.
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    avatar?: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class AuthService {
  // Login user
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return apiService.post<AuthResponse>('/auth/login', credentials);
  }

  // Register new user
  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return apiService.post<AuthResponse>('/auth/register', userData);
  }

  // Register admin user (requires authentication)
  async registerAdmin(userData: AdminRegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return apiService.post<AuthResponse>('/auth/admin/register', userData);
  }

  // Refresh token (if the backend supports it)
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ token: string; expiresIn?: number }>> {
    return apiService.post<{ token: string; expiresIn?: number }>('/auth/refresh', {
      refreshToken,
    });
  }

  // Returns the current authenticated user (using the cookie).
  async me(): Promise<ApiResponse<User>> {
    return apiService.get<User>('/auth/me');
  }

  // Alias kept for backwards compatibility — calls the same `/auth/me`.
  async getProfile(): Promise<ApiResponse<User>> {
    return this.me();
  }

  // Logout (if the backend has logout endpoint for token invalidation)
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/auth/logout');
  }

  // Validate token (utility method)
  async validateToken(token: string): Promise<boolean> {
    try {
      // Try to get profile with the token
      await this.getProfile();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Change password (if the backend supports it)
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return apiService.patch<{ message: string }>('/auth/password', data);
  }

  // Request password reset (if the backend supports it)
  async requestPasswordReset(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/auth/password/reset-request', {
      email,
    });
  }

  // Reset password with token (if the backend supports it)
  async resetPassword(data: {
    token: string;
    newPassword: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/auth/password/reset', data);
  }

  // Verify email (if the backend supports email verification)
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/auth/verify-email', { token });
  }

  // Resend verification email
  async resendVerificationEmail(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/auth/verify-email/resend', {
      email,
    });
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export types for external use
export type { LoginRequest, RegisterRequest, AdminRegisterRequest };