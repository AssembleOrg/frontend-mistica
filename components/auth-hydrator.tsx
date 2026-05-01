'use client';

import { useHydrateAuth } from '@/hooks/useAuth';

/**
 * Renderiza nada; sólo dispara `GET /auth/me` una vez al entrar a rutas
 * protegidas para revalidar la sesión persistida contra el backend.
 */
export function AuthHydrator() {
  useHydrateAuth();
  return null;
}
