// services/kitchen-production.admin.service.ts
//
// Producción de cocina: lo que cocina va preparando, con su cantidad. Por día
// y, si corresponde, para una reserva. Sólo registro (no mueve stock).
// El taller de cerámica usa el mismo registro con `area: 'taller'`.

import { apiService } from '@/services/api.service';

/** Quién produjo: cocina (default) o el taller de cerámica. */
export type ProductionArea = 'cocina' | 'taller';

export interface KitchenProductionItem {
  id: string;
  /** YYYY-MM-DD (Argentina). */
  day: string;
  item: string;
  quantity: number;
  unit?: string;
  reservationId?: string;
  /** "Stefanie · 15:30". */
  reservationLabel?: string;
  note?: string;
  byName?: string;
  area?: ProductionArea;
  createdAt?: string;
}

export interface KitchenProductionInput {
  day: string;
  item: string;
  quantity: number;
  unit?: string;
  /** '' la desvincula (al editar). */
  reservationId?: string;
  note?: string;
  registeredBy?: string;
  area?: ProductionArea;
}

export const kitchenProductionAdmin = {
  list: async (from: string, to: string, reservationId?: string, area?: ProductionArea) =>
    (
      await apiService.get<KitchenProductionItem[]>(
        `/kitchen-production?from=${from}&to=${to}${reservationId ? `&reservationId=${reservationId}` : ''}${area ? `&area=${area}` : ''}`,
      )
    ).data,
  suggestions: async () =>
    (await apiService.get<{ item: string; unit?: string }[]>('/kitchen-production/suggestions')).data,
  create: async (input: KitchenProductionInput) =>
    (
      await apiService.post<KitchenProductionItem>(
        '/kitchen-production',
        input as unknown as Record<string, unknown>,
      )
    ).data,
  update: async (id: string, input: Partial<KitchenProductionInput>) =>
    (
      await apiService.patch<KitchenProductionItem>(
        `/kitchen-production/${id}`,
        input as unknown as Record<string, unknown>,
      )
    ).data,
  remove: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/kitchen-production/${id}`)).data,
};
