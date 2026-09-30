// hooks/useAuth.ts

import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '@/stores/auth.store';
import {
  authService,
  type AdminRegisterRequest,
  type LoginRequest,
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
 * Llama una sola vez a `/auth/me` al montar el panel para validar la sesión
 * (el `user` en localStorage es sólo un hint; la verdad la tiene la cookie).
 *
 * Se consulta SIEMPRE, haya o no user guardado: la app instalada en iPhone
 * arranca con la cookie copiada de Safari pero con el localStorage vacío, y
 * sin esta consulta el panel quedaba en "Cargando..." para siempre.
 */
export function useHydrateAuth() {
  const { refreshUser } = useAuth();
  const setSessionCheckFailed = useAuthStore((s) => s.setSessionCheckFailed);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    setSessionCheckFailed(false);
    refreshUser().catch((error: unknown) => {
      const status = (error as ApiError)?.status;
      if (status === 401 || status === 403) {
        // Sin sesión válida: al login, volviendo después a donde estaba.
        const next = encodeURIComponent(
          window.location.pathname + window.location.search,
        );
        window.location.replace(`/login?next=${next}`);
        return;
      }
      // Sin red o backend caído: el panel ofrece reintentar.
      setSessionCheckFailed(true);
    });
  }, [refreshUser, setSessionCheckFailed]);
}
