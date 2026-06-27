// services/reservations.admin.service.ts
//
// Cliente ADMIN de reservas (post-login, cookie auth vía apiService).

import { apiService } from '@/services/api.service';
import type {
  PublicExperience,
  PublicSession,
} from '@/services/reservations.public.service';

export type AdminExperience = PublicExperience;
export type AdminSession = PublicSession;

export type ReservationPaymentMethod =
  | 'MERCADOPAGO'
  | 'CASH'
  | 'TRANSFER'
  | 'CARD'
  | 'COURTESY';

export interface ReservationItem {
  _id: string;
  code: string;
  status: string;
  source: string;
  paymentMethod: string;
  experienceName: string;
  startAt: string;
  quantity: number;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  sessionId: string;
  experienceId: string;
  createdAt: string;
}

export interface ReservationListResponse {
  items: ReservationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateExperienceInput {
  name: string;
  description?: string;
  durationMinutes: number;
  basePrice: number;
  defaultCapacity: number;
  images?: string[];
  isActive?: boolean;
}

export interface SessionSlotInput {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  capacity?: number;
  price?: number;
  notes?: string;
}

export interface GenerateSessionsInput {
  experienceId: string;
  slots: SessionSlotInput[];
  publish?: boolean;
}

export interface AdminCreateReservationInput {
  sessionId: string;
  quantity: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  clientId?: string;
  paymentMethod: ReservationPaymentMethod;
  amount?: number;
  notes?: string;
}

export const reservationsAdmin = {
  // Experiencias
  listExperiences: async (includeInactive = true) =>
    (
      await apiService.get<AdminExperience[]>(
        `/experiences?includeInactive=${includeInactive}`,
      )
    ).data,
  createExperience: async (input: CreateExperienceInput) =>
    (
      await apiService.post<AdminExperience>(
        '/experiences',
        input as unknown as Record<string, unknown>,
      )
    ).data,
  updateExperience: async (id: string, input: Partial<CreateExperienceInput>) =>
    (await apiService.patch<AdminExperience>(`/experiences/${id}`, input)).data,
  deleteExperience: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/experiences/${id}`)).data,

  // Turnos
  listSessions: async (params?: {
    experienceId?: string;
    status?: string;
    from?: string;
    to?: string;
    includePast?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.experienceId) q.set('experienceId', params.experienceId);
    if (params?.status) q.set('status', params.status);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.includePast) q.set('includePast', 'true');
    const qs = q.toString();
    return (
      await apiService.get<AdminSession[]>(
        `/experience-sessions${qs ? `?${qs}` : ''}`,
      )
    ).data;
  },
  generateSessions: async (input: GenerateSessionsInput) =>
    (
      await apiService.post<AdminSession[]>(
        '/experience-sessions/generate',
        input as unknown as Record<string, unknown>,
      )
    ).data,
  updateSession: async (
    id: string,
    input: { capacity?: number; price?: number; status?: string; notes?: string },
  ) =>
    (await apiService.patch<AdminSession>(`/experience-sessions/${id}`, input))
      .data,
  deleteSession: async (id: string) =>
    (
      await apiService.delete<{ success: boolean }>(
        `/experience-sessions/${id}`,
      )
    ).data,
  attendees: async (sessionId: string) =>
    (
      await apiService.get<{ session: AdminSession; reservations: ReservationItem[] }>(
        `/experience-sessions/${sessionId}/attendees`,
      )
    ).data,

  // Reservas
  createReservation: async (input: AdminCreateReservationInput) =>
    (
      await apiService.post<ReservationItem>(
        '/admin/reservations',
        input as unknown as Record<string, unknown>,
      )
    ).data,
  listReservations: async (params?: {
    status?: string;
    sessionId?: string;
    experienceId?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.sessionId) q.set('sessionId', params.sessionId);
    if (params?.experienceId) q.set('experienceId', params.experienceId);
    q.set('page', String(params?.page ?? 1));
    q.set('limit', String(params?.limit ?? 20));
    return (
      await apiService.get<ReservationListResponse>(
        `/admin/reservations?${q.toString()}`,
      )
    ).data;
  },
};
