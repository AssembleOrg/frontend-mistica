// hooks/useAuth.ts

import { useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { authService, LoginRequest, RegisterRequest } from '@/services/auth.service';
import { ApiError } from '@/services/api.service';
import { toast } from 'sonner';

// Hook state interface
interface UseAuthState {
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const store = useAuthStore();
  const [state, setState] = useState<UseAuthState>({
    loading: false,
    error: null,
  });

  // Handle API errors
  const handleApiError = useCallback((error: unknown, action: string) => {
    const apiError = error as ApiError;
    const errorMessage = apiError?.message || `Error en ${action}`;
    
    setState(prev => ({ ...prev, error: errorMessage }));
    toast.error(errorMessage);
    
    console.error(`${action} failed:`, error);
  }, []);

  // Login (async)
  const login = useCallback(async (credentials: LoginRequest) => {
    console.log('🔑 LOGIN: Iniciando login con:', credentials);
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await authService.login(credentials);
      console.log('🔑 LOGIN: Respuesta del backend:', response);
      
      // Backend devuelve access_token, no token
      const { user, access_token } = response.data;
      console.log('🔑 LOGIN: User extraído:', user);
      console.log('🔑 LOGIN: Access token extraído:', access_token);
      
      // Update store with response data
      store.setUser(user);
      store.setToken(access_token);
      store.setAuthenticated(true);
      
      console.log('🔑 LOGIN: Estado actualizado en store');
      console.log('🔑 LOGIN: Token guardado:', store.token);
      console.log('🔑 LOGIN: Usuario guardado:', store.user);
      console.log('🔑 LOGIN: Autenticado:', store.isAuthenticated);
      
      toast.success(`¡Bienvenido, ${user.name}!`);
      setState(prev => ({ ...prev, loading: false }));
      
      return response.data;
    } catch (error) {
      console.error('🔑 LOGIN: Error en login:', error);
      handleApiError(error, 'iniciar sesión');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [store, handleApiError]);

  // Register (async)
  const register = useCallback(async (userData: RegisterRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await authService.register(userData);
      const { user, access_token } = response.data;
      
      // Update store with response data
      store.setUser(user);
      store.setToken(access_token);
      store.setAuthenticated(true);
      
      toast.success(`¡Cuenta creada exitosamente! Bienvenido, ${user.name}!`);
      setState(prev => ({ ...prev, loading: false }));
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'crear cuenta');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [store, handleApiError]);

  // Register admin (async)
  const registerAdmin = useCallback(async (userData: RegisterRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await authService.registerAdmin(userData);
      const { user, access_token } = response.data;
      
      // Update store with response data
      store.setUser(user);
      store.setToken(access_token);
      store.setAuthenticated(true);
      
      toast.success(`¡Administrador creado exitosamente! Bienvenido, ${user.name}!`);
      setState(prev => ({ ...prev, loading: false }));
      
      return response.data;
    } catch (error) {
      handleApiError(error, 'crear administrador');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [store, handleApiError]);

  // Logout
  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Call backend logout if it exists
      await authService.logout().catch(() => {
        // Ignore logout errors from backend - still logout locally
      });
      
      // Clear local auth state
      store.logout();
      
      toast.success('Sesión cerrada exitosamente');
      setState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      // Even if backend logout fails, logout locally
      store.logout();
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [store]);

  // Refresh token (if needed)
  const refreshToken = useCallback(async (refreshToken: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await authService.refreshToken(refreshToken);
      
      store.setToken(response.data.token);
      
      setState(prev => ({ ...prev, loading: false }));
      return response.data;
    } catch (error) {
      handleApiError(error, 'renovar token');
      // If refresh fails, logout user
      store.logout();
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [store, handleApiError]);

  // Get user profile (if needed)
  const getProfile = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await authService.getProfile();
      
      // Update user data in store
      store.setUser(response.data);
      
      setState(prev => ({ ...prev, loading: false }));
      return response.data;
    } catch (error) {
      handleApiError(error, 'obtener perfil');
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [store, handleApiError]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Check if user has specific role
  const hasRole = useCallback((role: string) => {
    return store.user?.role === role;
  }, [store.user?.role]);

  // Check if user is admin
  const isAdmin = useCallback(() => {
    return store.user?.role === 'admin';
  }, [store.user?.role]);

  return {
    // State from store
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    
    // Loading/error states from hook
    loading: state.loading,
    error: state.error,
    
    // Actions
    login,
    register,
    registerAdmin,
    logout,
    refreshToken,
    getProfile,
    
    // Utilities
    clearError,
    hasRole,
    isAdmin,
  };
}