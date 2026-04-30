// stores/auth.store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authService, AuthResponse, User } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Simple synchronous setters (following 4-layer architecture)
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      // Simple synchronous setters (no async logic in store)
      setUser: (user: User | null) => set({ user }),
      
      setToken: (token: string | null) => set({ token }),
      
      setAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
      
      logout: () => {
        set({ 
          user: null,
          token: null,
          isAuthenticated: false
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
          // Token exists, restore authenticated state
          state.isAuthenticated = true;
        } else if (state) {
          // No token, ensure clean state
          state.isAuthenticated = false;
          state.user = null;
          state.token = null;
        }
      },
    }
  )
);
