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
  unitPrice: number;
  amount: number;
  depositAmount?: number;
  totalAmount?: number;
  balanceDue?: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  sessionId: string;
  experienceId: string;
  /**
   * Restricciones alimentarias del grupo. Se muestran SIEMPRE junto a la
   * reserva: el equipo se tiene que enterar antes del día, no cuando la
   * persona llega.
   */
  dietaryTags?: string[];
  dietaryNotes?: string;
  shiftKey?: string;
  tableCodes?: string[];
  sharedTable?: boolean;
  notes?: string;
  createdAt: string;
}

export interface ReservationListResponse {
  items: ReservationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}


/**
 * Variante de precio: modalidad alternativa (escuelita "Mensual") o promo
 * auto-aplicable. Una variante POR_PERSONA con al menos una condición se
 * aplica SOLA al precio de la reserva cuando se cumplen todas: rango de
 * personas (cumpleaños 5+/10+), días de semana (promo martes) y/o fecha o
 * rango de fechas (promo del 20/12). El resto es informativo (el bot lo
 * menciona).
 */
export interface PriceVariant {
  name: string;
  price: number;
  unit: 'PER_PERSON' | 'FLAT';
  minQty?: number;
  maxQty?: number;
  /** Días de semana ISO (1=lunes..7=domingo) en los que rige. */
  days?: number[];
  /** Rige desde ('YYYY-MM-DD'). Igual a dateTo = fecha puntual. */
  dateFrom?: string;
  /** Rige hasta ('YYYY-MM-DD'). */
  dateTo?: string;
  description?: string;
  active?: boolean;
}

export interface CreateExperienceInput {
  name: string;
  description?: string;
  /**
   * Apodos y abreviaturas con los que los clientes la nombran ("AYD",
   * "arte y degu"). El bot los usa para reconocerla en la charla. No pueden
   * repetirse entre experiencias: el backend rechaza el duplicado.
   */
  aliases?: string[];
  /** Variantes de precio (modalidades y tiers por cantidad). */
  priceVariants?: PriceVariant[];
  durationMinutes: number;
  basePrice: number;
  defaultCapacity: number;
  depositPct?: number;
  // Color hex (#RRGGBB) para la agenda. Obligatorio.
  color: string;
  images?: string[];
  isActive?: boolean;
  // false = servicio coordinado (no se reserva online; solo info + consulta).
  bookableOnline?: boolean;
  // Lugares fijos del salón que ocupa un turno abierto (mesa de taller = 10).
  venueSeats?: number;
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
  /** Turno existente… */
  sessionId?: string;
  /** …o el trío (experiencia, día, hora): el turno se crea solo. El horario
   *  es libre dentro de la ventana del negocio. */
  experienceId?: string;
  /** Día, YYYY-MM-DD. */
  date?: string;
  /** Hora local de inicio, 'HH:mm'. */
  startTime?: string;
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
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.sessionId) q.set('sessionId', params.sessionId);
    if (params?.experienceId) q.set('experienceId', params.experienceId);
    if (params?.search?.trim()) q.set('search', params.search.trim());
    q.set('page', String(params?.page ?? 1));
    q.set('limit', String(params?.limit ?? 20));
    return (
      await apiService.get<ReservationListResponse>(
        `/admin/reservations?${q.toString()}`,
      )
    ).data;
  },
  cancelReservation: async (id: string) =>
    (await apiService.post<ReservationItem>(`/admin/reservations/${id}/cancel`, {}))
      .data,
  resolveReservation: async (id: string, action: 'confirm' | 'cancel') =>
    (
      await apiService.post<ReservationItem>(`/admin/reservations/${id}/resolve`, {
        action,
      })
    ).data,
  // Reprogramar a otro turno. Política: hasta 48 hs antes del turno original;
  // `force` la saltea (override admin).
  rescheduleReservation: async (id: string, sessionId: string, force?: boolean) =>
    (
      await apiService.post<ReservationItem>(
        `/admin/reservations/${id}/reschedule`,
        { sessionId, ...(force ? { force: true } : {}) },
      )
    ).data,
  updateReservation: async (
    id: string,
    input: {
      customerName?: string;
      customerEmail?: string;
      customerPhone?: string;
      notes?: string;
    },
  ) => (await apiService.patch<ReservationItem>(`/admin/reservations/${id}`, input)).data,
  collectBalance: async (
    id: string,
    payments: { method: ReservationPaymentMethod; amount: number }[],
  ) =>
    (
      await apiService.post<ReservationItem>(
        `/admin/reservations/${id}/collect-balance`,
        { payments, markCompleted: true },
      )
    ).data,
};
