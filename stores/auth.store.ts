// stores/auth.store.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/services/auth.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;

  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  logout: () => void;
}

// El access token vive en una cookie httpOnly seteada por el backend; el
// frontend nunca lo lee. Sólo persistimos `user` para evitar el flicker en el
// primer render — la sesión real se valida en el mount con `GET /auth/me`.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: 'mistica-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        // El user persistido es sólo un hint; lo verifica `GET /auth/me`.
        if (state) state.isAuthenticated = !!state.user;
      },
    }
  )
);
