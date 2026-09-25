// services/bot.admin.service.ts
//
// Bot de WhatsApp desde el admin: estado/sesión (proxy al control server del
// bot con el secreto server-side), configuración editable (textos, datos del
// negocio, transferencia), preguntas frecuentes / políticas y el probador.

import { apiService } from '@/services/api.service';

export interface BotStatus {
  connected: boolean;
  loggedIn: boolean;
  qr: string | null; // PNG en base64 (sin prefijo data:)
}

export interface BotBusiness {
  name: string;
  address: string;
  maps: string;
  hours: string;
  instagram: string;
  facebook: string;
}

export interface BotTransfer {
  alias: string;
  ownerName: string;
  ownerCuit: string;
  bank: string;
}

export interface BotTexts {
  greeting: string;
  farewell: string;
  error: string;
  audioFail: string;
  rateLimit: string;
  safeFallback: string;
  jailbreakRefusal: string;
  transferNotReceipt: string;
  transferReview: string;
  transferOrphan: string;
  transferExpired: string;
  botOff: string;
}

export interface BotSettings {
  botActive: boolean;
  business: BotBusiness;
  transfer: BotTransfer;
  texts: BotTexts;
}

export type BotSettingsInput = {
  botActive?: boolean;
  business?: Partial<BotBusiness>;
  transfer?: Partial<BotTransfer>;
  texts?: Partial<BotTexts>;
};

export interface BotFaq {
  id: string;
  title: string;
  examples: string[];
  answer: string;
  active: boolean;
  order: number;
}

export type BotFaqInput = {
  title: string;
  examples: string[];
  answer: string;
  active?: boolean;
  order?: number;
};

export interface BotTryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface BotTryResult {
  reply: string;
  tools: string[];
  intent?: string | null;
  tags?: string[];
  ms: number;
}

export const botAdmin = {
  status: async () => (await apiService.get<BotStatus>('/admin/bot/status')).data,
  restart: async () =>
    (await apiService.post<{ ok: boolean }>('/admin/bot/restart', {})).data,
  logout: async () =>
    (await apiService.post<{ ok: boolean }>('/admin/bot/logout', {})).data,

  settings: async () =>
    (await apiService.get<BotSettings>('/admin/bot/settings')).data,
  saveSettings: async (input: BotSettingsInput) =>
    (await apiService.put<BotSettings>('/admin/bot/settings', input)).data,

  faqs: async () => (await apiService.get<BotFaq[]>('/admin/bot/faq')).data,
  createFaq: async (input: BotFaqInput) =>
    (await apiService.post<BotFaq>('/admin/bot/faq', input)).data,
  updateFaq: async (id: string, input: Partial<BotFaqInput>) =>
    (await apiService.patch<BotFaq>(`/admin/bot/faq/${id}`, input)).data,
  deleteFaq: async (id: string) =>
    (await apiService.delete<{ ok: boolean }>(`/admin/bot/faq/${id}`)).data,

  /** Probador: "¿qué respondería el bot a…?" (en seco, no manda nada). */
  try: async (message: string, history: BotTryTurn[]) =>
    (
      await apiService.post<BotTryResult>('/admin/bot/try', {
        message,
        history,
      })
    ).data,
};
