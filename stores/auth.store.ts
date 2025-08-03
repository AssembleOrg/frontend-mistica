// stores/auth.store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService } from '@/services/auth.service';
import type { User } from '@/types/user.types';

interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      status: 'idle',
      error: null,
      isAuthenticated: false,

      login: async (email, password) => {
        set({ status: 'loading', error: null });
        try {
          const { user, token } = await authService.login({ email, password });

          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            status: 'success',
            error: null 
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Error inesperado';
          set({
            status: 'error',
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
          });

          throw error;
        }
      },

      logout: () => {
        set({ 
          user: null,
          token: null,
          isAuthenticated: false, 
          status: 'idle', 
          error: null 
        });
      },
    }),
    {
      name: 'mistica-auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential auth data
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // Automatically restore authentication state on hydration
      onRehydrateStorage: () => (state) => {
        if (state && state.token && state.user) {
          // Token exists, validate and restore authenticated state
          state.isAuthenticated = true;
          state.status = 'success';
          state.error = null;
        } else if (state) {
          // No token, ensure clean state
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
          state.status = 'idle';
          state.error = null;
        }
      },
    }
  )
);
