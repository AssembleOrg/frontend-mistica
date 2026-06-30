// services/closed-dates.admin.service.ts
//
// Cliente ADMIN de "días cerrados" (post-login, cookie auth vía apiService).
// El local no abre esos días: bloquean generación de turnos y reservas, y el
// bot los usa para avisar.

import { apiService } from '@/services/api.service';

export type ClosedDateKind = 'DATE' | 'WEEKLY';

export interface ClosedDate {
  id: string;
  kind: ClosedDateKind;
  weekday?: number; // 1 = lunes … 7 = domingo (ISO)
  from?: string; // YYYY-MM-DD (kind=DATE)
  to?: string; // YYYY-MM-DD (kind=DATE)
  reason?: string;
}

export interface CreateClosedDateInput {
  kind: ClosedDateKind;
  from?: string; // requerido si kind=DATE
  to?: string; // opcional; si falta = from (un solo día)
  weekday?: number; // requerido si kind=WEEKLY
  reason?: string;
}

export const closedDatesAdmin = {
  list: async () =>
    (await apiService.get<ClosedDate[]>('/closed-dates')).data,

  create: async (input: CreateClosedDateInput) =>
    (
      await apiService.post<ClosedDate>(
        '/closed-dates',
        input as unknown as Record<string, unknown>,
      )
    ).data,

  remove: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/closed-dates/${id}`)).data,
};

export const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  7: 'Domingo',
};
