// services/space-blocks.admin.service.ts
//
// Cliente ADMIN de "bloqueos de espacio": talleres recurrentes o eventos
// puntuales que ocupan lugares del salón y restan capacidad del local en su
// franja horaria (aunque no sean turnos reservables).

import { apiService } from '@/services/api.service';

export type SpaceBlockKind = 'WEEKLY' | 'ONE_OFF';

export interface SpaceBlock {
  _id: string;
  kind: SpaceBlockKind;
  weekday?: number; // 1 = lunes … 7 = domingo (ISO), para WEEKLY
  date?: string; // YYYY-MM-DD, para ONE_OFF
  start: string; // HH:mm
  end: string; // HH:mm
  seats: number;
  label?: string;
}

export interface CreateSpaceBlockInput {
  kind: SpaceBlockKind;
  weekday?: number;
  date?: string;
  start: string;
  end: string;
  seats: number;
  label?: string;
}

export const spaceBlocksAdmin = {
  list: async () =>
    (await apiService.get<SpaceBlock[]>('/space-blocks')).data,
  create: async (input: CreateSpaceBlockInput) =>
    (
      await apiService.post<SpaceBlock>(
        '/space-blocks',
        input as unknown as Record<string, unknown>,
      )
    ).data,
  remove: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/space-blocks/${id}`)).data,
};
