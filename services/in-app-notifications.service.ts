import { apiService } from './api.service';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'PAYMENT_DUE' | 'TASK_DUE' | 'INFO';
  createdAt: string;
  read: boolean;
}

// Antes había un `subscribe` por SSE; se sacó porque cada stream abierto
// mantenía viva una función de Netlify. La campana ahora consulta `list` con
// `pollWhileVisible` (ver `lib/poll-while-visible.ts`).
export const inAppNotifications = {
  list: async () => (await apiService.get<InAppNotification[]>('/in-app-notifications')).data,
  markRead: async (id: string) =>
    (await apiService.patch<InAppNotification>(`/in-app-notifications/${id}/read`, {})).data,
};
