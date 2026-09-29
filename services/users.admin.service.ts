// services/users.admin.service.ts
//
// Cliente ADMIN de CUENTAS del sistema (post-login, cookie auth). Crear y
// resetear cuentas, cambiar contraseñas, roles y qué vistas del panel puede
// ver cada una.

import { apiService } from '@/services/api.service';

export type AccountRole = 'admin' | 'user';

export interface Account {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  avatar?: string | null;
  /** Whitelist de vistas del panel; vacía = acceso estándar según el rol. */
  allowedViews: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateAccountInput {
  email: string;
  name: string;
  password: string;
  role: AccountRole;
  allowedViews?: string[];
}

export interface UpdateAccountInput {
  email?: string;
  name?: string;
  /** Setearla resetea la contraseña (se guarda hasheada). */
  password?: string;
  role?: AccountRole;
  allowedViews?: string[];
}

export const usersAdmin = {
  list: async () => (await apiService.get<Account[]>('/users/all')).data,

  create: async (input: CreateAccountInput) =>
    (
      await apiService.post<Account>(
        '/users',
        input as unknown as Record<string, unknown>,
      )
    ).data,

  update: async (id: string, input: UpdateAccountInput) =>
    (
      await apiService.patch<Account>(
        `/users/${id}`,
        input as unknown as Record<string, unknown>,
      )
    ).data,

  remove: async (id: string) =>
    (await apiService.delete<void>(`/users/${id}`)).data,
};

/** Contraseña aleatoria legible (para el botón "generar"). */
export function generatePassword(length = 10): string {
  // Sin caracteres ambiguos (0/O, 1/l/I) para poder dictarla por teléfono.
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  return [...buf].map((n) => chars[n % chars.length]).join('');
}
