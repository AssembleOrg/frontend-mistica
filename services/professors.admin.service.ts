// services/professors.admin.service.ts
//
// Profesores del taller: a quiénes se les asignan las piezas. Cada profesor
// puede tener una cuenta de acceso al panel vinculada (con la pestaña Piezas
// habilitada, o las que el admin elija desde Cuentas).

import { apiService } from '@/services/api.service';

export interface Professor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  active: boolean;
  /** Cuenta de acceso vinculada. */
  userId?: string;
  accountEmail?: string;
  createdAt: string;
}

export interface ProfessorInput {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  userId?: string;
  active?: boolean;
}

export const professorsAdmin = {
  list: async () => (await apiService.get<Professor[]>('/professors')).data,

  create: async (input: ProfessorInput) =>
    (
      await apiService.post<Professor & { _id?: string }>(
        '/professors',
        input as unknown as Record<string, unknown>,
      )
    ).data,

  update: async (id: string, input: Partial<ProfessorInput>) =>
    (
      await apiService.patch<Professor>(
        `/professors/${id}`,
        input as unknown as Record<string, unknown>,
      )
    ).data,

  remove: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/professors/${id}`)).data,
};
