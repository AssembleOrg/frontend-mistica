import { apiService } from './api.service';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'PAYMENT_DUE' | 'TASK_DUE' | 'INFO';
  /** Ruta del panel a la que lleva (p. ej. la pestaña Cocina). */
  link?: string;
  createdAt: string;
  read: boolean;
}

export interface InAppNotificationEvent {
  type: 'created' | 'read';
  notification: InAppNotification;
}

/** Stream SSE (directo al backend, ver `lib/live-stream.ts`). */
export const IN_APP_NOTIFICATIONS_STREAM_PATH = '/in-app-notifications/stream';

export const inAppNotifications = {
  list: async () => (await apiService.get<InAppNotification[]>('/in-app-notifications')).data,
  markRead: async (id: string) =>
    (await apiService.patch<InAppNotification>(`/in-app-notifications/${id}/read`, {})).data,
  markAllRead: async () =>
    (await apiService.patch<{ updated: number }>('/in-app-notifications/read-all', {})).data,
};
