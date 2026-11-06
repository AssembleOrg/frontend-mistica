// services/kilns.admin.service.ts
//
// Registro de los hornos: quién prendió o apagó y descargó cuál, y cuándo.

import { apiService } from '@/services/api.service';

export type KilnKey = 'SUPERIOR' | 'FRONTAL';
export type KilnAction = 'ON' | 'OFF';

export interface KilnLogItem {
  id: string;
  kiln: KilnKey;
  kilnName: string;
  action: KilnAction;
  actionName: string;
  at: string;
  byName?: string;
  note?: string;
}

export interface KilnStatus {
  kiln: KilnKey;
  kilnName: string;
  on: boolean;
  /** Prendido y con el timer corriendo (13 h frontal, 26 h superior). */
  running?: boolean;
  durationMs?: number;
  /** Cuándo termina el último prendido (ISO). */
  endsAt?: string | null;
  last: KilnLogItem | null;
}

export const kilnsAdmin = {
  status: async () => (await apiService.get<KilnStatus[]>('/kilns/status')).data,
  logs: async (from: string, to: string) =>
    (await apiService.get<KilnLogItem[]>(`/kilns/logs?from=${from}&to=${to}`)).data,
  register: async (input: {
    kiln: KilnKey;
    action: KilnAction;
    registeredBy?: string;
    /** Horno que nadie marcó en el momento (ISO). Sólo admin/encargado. */
    at?: string;
  }) =>
    (
      await apiService.post<KilnLogItem>(
        '/kilns/logs',
        input as unknown as Record<string, unknown>,
      )
    ).data,
  remove: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/kilns/logs/${id}`)).data,
};
