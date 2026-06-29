// services/bot.admin.service.ts
//
// Control del bot de WhatsApp desde el admin. Pega al backend (que proxea al
// control server del bot con el secreto server-side).

import { apiService } from '@/services/api.service';

export interface BotStatus {
  connected: boolean;
  loggedIn: boolean;
  qr: string | null; // PNG en base64 (sin prefijo data:)
}

export const botAdmin = {
  status: async () => (await apiService.get<BotStatus>('/admin/bot/status')).data,
  restart: async () =>
    (await apiService.post<{ ok: boolean }>('/admin/bot/restart', {})).data,
  logout: async () =>
    (await apiService.post<{ ok: boolean }>('/admin/bot/logout', {})).data,
};
