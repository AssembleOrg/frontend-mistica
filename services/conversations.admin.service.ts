// services/conversations.admin.service.ts
//
// Charlas con una persona real. Cuando un cliente pide hablar con alguien del
// equipo, el bot deja de responder ese chat y todo pasa por acá.
//
// Los avisos llegan por SSE (no por polling): son eventos servidor→panel, y el
// panel manda sus mensajes por POST normal.

import { apiService } from '@/services/api.service';
import { getApiBaseUrl } from '@/lib/api/base-url';

export type ConversationStatus = 'WAITING' | 'HUMAN' | 'CLOSED';
export type MessageAuthor = 'CLIENT' | 'BOT' | 'ADMIN';

export interface Conversation {
  id: string;
  phone: string;
  customerName?: string;
  status: ConversationStatus;
  reason?: string;
  requestedAt: string;
  takenByName?: string;
  takenAt?: string;
  closedAt?: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  unreadForAdmin: number;
}

export interface ConversationMessage {
  id: string;
  author: MessageAuthor;
  authorName?: string;
  body: string;
  /** Sólo en los del equipo: false = WhatsApp rechazó el envío. */
  delivered?: boolean;
  createdAt: string;
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
  };
  conversation?: Conversation;
}

export const conversationsAdmin = {
  list: async (status?: ConversationStatus) =>
    (
      await apiService.get<Conversation[]>(
        `/conversations${status ? `?status=${status}` : ''}`,
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

  /**
   * Suscripción a los eventos en vivo. Devuelve la función para cortar.
   *
   * Usa EventSource, que reconecta solo si se cae la conexión. La cookie de
   * sesión viaja con `withCredentials`, igual que el resto de las llamadas del
   * panel.
   */
  subscribe(
    onEvent: (event: ConversationEvent) => void,
    onError?: () => void,
  ): () => void {
    const source = new EventSource(`${getApiBaseUrl()}/conversations/stream`, {
      withCredentials: true,
    });
    source.onmessage = (e: MessageEvent<string>) => {
      try {
        onEvent(JSON.parse(e.data) as ConversationEvent);
      } catch {
        /* un evento mal formado no debe tirar abajo la suscripción */
      }
    };
    source.onerror = () => onError?.();
    return () => source.close();
  },
};
