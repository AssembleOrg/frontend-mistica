// hooks/useAuth.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/stores/auth.store';
import {
  authService,
  type AdminRegisterRequest,
  type LoginRequest,
  type RegisterRequest,
} from '@/services/auth.service';
import type { ApiError } from '@/services/api.service';
import { showToast } from '@/lib/toast';

interface UseAuthState {
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { setUser, logout: storeLogout } = useAuthStore(
    useShallow((s) => ({ setUser: s.setUser, logout: s.logout }))
  );

  const [state, setState] = useState<UseAuthState>({ loading: false, error: null });

  const handleApiError = useCallback((error: unknown, action: string) => {
    const apiError = error as ApiError;
    const errorMessage = apiError?.message || `Error en ${action}`;
    setState((prev) => ({ ...prev, error: errorMessage }));
    showToast.error(errorMessage);
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setState({ loading: true, error: null });
      try {
        const response = await authService.login(credentials);
        // El backend setea la cookie httpOnly; sólo necesitamos el `user`.
        const { user: loggedUser } = response.data;
        setUser(loggedUser);
        showToast.success(`¡Bienvenido, ${loggedUser.name}!`);
        return response.data;
      } catch (error) {
        handleApiError(error, 'iniciar sesión');
        throw error;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [setUser, handleApiError]
  );

  const register = useCallback(
    async (userData: RegisterRequest) => {
      setState({ loading: true, error: null });
      try {
        const response = await authService.register(userData);
        // Tras registrarse el flujo es ir a login (el backend no auto-loguea).
        showToast.success('¡Cuenta creada! Iniciá sesión para continuar.');
        return response.data;
      } catch (error) {
        handleApiError(error, 'crear cuenta');
        throw error;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [handleApiError]
  );

  const registerAdmin = useCallback(
    async (userData: AdminRegisterRequest) => {
      setState({ loading: true, error: null });
      try {
        const response = await authService.registerAdmin(userData);
        showToast.success('Administrador creado exitosamente');
        return response.data;
      } catch (error) {
        handleApiError(error, 'crear administrador');
        throw error;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [handleApiError]
  );

  const logout = useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      await authService.logout().catch(() => {
        // Si el backend falla, igual limpiamos el estado local.
      });
      storeLogout();
      showToast.success('Sesión cerrada exitosamente');
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [storeLogout]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.me();
      setUser(response.data);
      return response.data;
    } catch (error) {
      // Sesión inválida o expirada: limpiamos el estado local.
      storeLogout();
      throw error;
    }
  }, [setUser, storeLogout]);

  const userRole = user?.role;
  const hasRole = useCallback((role: string) => userRole === role, [userRole]);
  const isAdmin = useCallback(() => userRole === 'admin', [userRole]);

  const clearError = useCallback(() => setState((prev) => ({ ...prev, error: null })), []);

  return {
    user,
    isAuthenticated,
    loading: state.loading,
    error: state.error,

    login,
    register,
    registerAdmin,
    logout,
    refreshUser,
    getProfile: refreshUser, // alias

    clearError,
    hasRole,
    isAdmin,
  };
}

/**
 * Llama una sola vez a `/auth/me` al montar la app para validar la sesión
 * persistida (el `user` en localStorage es sólo un hint; la verdad la tiene
 * la cookie del backend).
 */
export function useHydrateAuth() {
  const { refreshUser } = useAuth();
  const persistedUser = useAuthStore((s) => s.user);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (persistedUser) {
      void refreshUser().catch(() => {
        // refreshUser ya se encarga de limpiar el estado en caso de 401.
      });
    }
  }, [persistedUser, refreshUser]);
}
