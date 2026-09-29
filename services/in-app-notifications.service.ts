import { getApiBaseUrl } from '@/lib/api/base-url';
import { apiService } from './api.service';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'PAYMENT_DUE' | 'TASK_DUE' | 'INFO';
  createdAt: string;
  read: boolean;
}

export interface InAppNotificationEvent {
  type: 'created' | 'read';
  notification: InAppNotification;
}

export const inAppNotifications = {
  list: async () => (await apiService.get<InAppNotification[]>('/in-app-notifications')).data,
  markRead: async (id: string) =>
    (await apiService.patch<InAppNotification>(`/in-app-notifications/${id}/read`, {})).data,
  subscribe(onEvent: (event: InAppNotificationEvent) => void): () => void {
    const source = new EventSource(`${getApiBaseUrl()}/in-app-notifications/stream`, {
      withCredentials: true,
    });
    source.onmessage = (event: MessageEvent<string>) => {
      try { onEvent(JSON.parse(event.data) as InAppNotificationEvent); } catch { /* ignore */ }
    };
    return () => source.close();
  },
};
