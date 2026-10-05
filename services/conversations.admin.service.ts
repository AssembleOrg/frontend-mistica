// services/conversations.admin.service.ts
//
// Charlas con una persona real. Cuando un cliente pide hablar con alguien del
// equipo, el bot deja de responder ese chat y todo pasa por acá.
//
// Los avisos llegan por SSE directo al backend (`lib/live-stream.ts`, sin pasar
// por el proxy de Netlify); si no está configurado o se cae, la bandeja vuelve
// al polling corto con la pestaña visible.

import { apiService } from '@/services/api.service';

export type ConversationStatus = 'BOT' | 'WAITING' | 'HUMAN' | 'CLOSED';
export type MessageAuthor = 'CLIENT' | 'BOT' | 'ADMIN';

export interface Conversation {
  id: string;
  phone: string;
  customerName?: string;
  status: ConversationStatus;
  /** Tema detectado de la consulta (ej. "Cumpleaños", "Reserva"). */
  intent?: string;
  /** Etiquetas para filtrar la bandeja. */
  tags?: string[];
  reason?: string;
  requestedAt: string;
  takenByName?: string;
  takenAt?: string;
  closedAt?: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  unreadForAdmin: number;
}

export type MediaKind = 'image' | 'document';

export interface ConversationMessage {
  id: string;
  author: MessageAuthor;
  authorName?: string;
  body: string;
  /** Sólo en los del equipo: false = WhatsApp rechazó el envío. */
  delivered?: boolean;
  createdAt: string;
  /** Adjunto que mandó el cliente (imagen/documento), si hay. */
  mediaKind?: MediaKind;
  mediaMime?: string;
  mediaName?: string;
  /** URL firmada de corta vida para ver/descargar el adjunto. */
  mediaUrl?: string;
}

export interface ConversationEvent {
  type: 'opened' | 'message' | 'closed';
  conversationId: string;
  phone: string;
  message?: {
    author: MessageAuthor;
    authorName?: string;
    body: string;
    createdAt: string;
    mediaKind?: MediaKind;
    mediaMime?: string;
    mediaName?: string;
    mediaUrl?: string;
  };
  conversation?: Conversation;
}

/** Stream SSE (directo al backend, ver `lib/live-stream.ts`). */
export const CONVERSATIONS_STREAM_PATH = '/conversations/stream';

export const conversationsAdmin = {
  /**
   * Bandeja paginada. `status` acepta uno o varios separados por coma
   * (ej. "BOT,WAITING,HUMAN" para las abiertas). Sin status trae todas.
   */
  list: async (opts: { status?: string; limit?: number; page?: number } = {}) => {
    const q = new URLSearchParams();
    if (opts.status) q.set('status', opts.status);
    if (opts.limit) q.set('limit', String(opts.limit));
    if (opts.page) q.set('page', String(opts.page));
    const qs = q.toString();
    return (
      await apiService.get<Conversation[]>(`/conversations${qs ? `?${qs}` : ''}`)
    ).data;
  },

  counts: async () =>
    (
      await apiService.get<Record<ConversationStatus, number>>(
        '/conversations/counts',
      )
    ).data,

  messages: async (id: string) =>
    (
      await apiService.get<{
        conversation: Conversation;
        messages: ConversationMessage[];
      }>(`/conversations/${id}/messages`)
    ).data,

  take: async (id: string) =>
    (await apiService.post<Conversation>(`/conversations/${id}/take`, {})).data,

  reply: async (id: string, body: string) =>
    (
      await apiService.post<{ id: string; delivered: boolean }>(
        `/conversations/${id}/messages`,
        { body },
      )
    ).data,

  close: async (id: string) =>
    (await apiService.post<Conversation>(`/conversations/${id}/close`, {})).data,
};
