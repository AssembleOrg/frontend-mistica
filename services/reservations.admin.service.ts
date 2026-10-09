// services/reservations.admin.service.ts
//
// Cliente ADMIN de reservas (post-login, cookie auth vía apiService).

import { apiService } from '@/services/api.service';
import type { CreateSaleRequest, Sale } from '@/services/sales.service';
import type {
  PreviewTablesResult,
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
  /** De esas personas, cuántas van bonificadas (entran pero no se cobran). */
  freeSpots?: number;
  /** Hora extra: minutos que se suman a la duración de la experiencia. */
  extraMinutes?: number;
  // Datos personales e importes: NO llegan a las cuentas que sólo tienen
  // alguna pestaña de Reservas (p. ej. cocina), el backend los recorta.
  unitPrice?: number;
  amount?: number;
  depositAmount?: number;
  totalAmount?: number;
  balanceDue?: number;
  customerName?: string;
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
  /** true = cumpleaños sobre la experiencia (beneficios aplicados). */
  isBirthday?: boolean;
  shiftKey?: string;
  tableCodes?: string[];
  sharedTable?: boolean;
  /** Adicionales sumados después (p. ej. de piezas); ya están en el total. */
  extras?: { label: string; amount: number }[];
  notes?: string;
  /** Lo que cocina tiene que saber (cumpleañero, sabor, horario de la torta). */
  kitchenNotes?: string;
  /** Tortas a preparar (la simbólica de regalo o las que se venden aparte). */
  cakes?: ReservationCake[];
  /** Comprobantes que mandó el cliente por WhatsApp, para verificar. */
  transferReceipts?: TransferReceipt[];
  createdAt: string;
}

export interface ReservationCake {
  _id?: string;
  label: string;
  qty: number;
  /** Precio unitario (sólo admin). 0 = de regalo. */
  amount?: number;
  free?: boolean;
  notes?: string;
}

export interface TransferReceipt {
  _id?: string;
  /** Imagen privada: se ve con una URL firmada (leads/receipt-image). */
  imageKey?: string;
  amountDetected?: number;
  recipientOk?: boolean;
  operationNumber?: string;
  receiptDate?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DISMISSED';
  acceptedAmount?: number;
  createdAt?: string;
  resolvedAt?: string;
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
  /**
   * Precio. AUSENTE = beneficio puro: mantiene el precio base sobre el que
   * aplica (los beneficios del cumpleaños heredan el de la experiencia
   * elegida).
   */
  price?: number;
  unit: 'PER_PERSON' | 'FLAT';
  minQty?: number;
  maxQty?: number;
  /** Días de semana ISO (1=lunes..7=domingo) en los que rige. */
  days?: number[];
  /** Rige desde ('YYYY-MM-DD'). Igual a dateTo = fecha puntual. */
  dateFrom?: string;
  /** Rige hasta ('YYYY-MM-DD'). */
  dateTo?: string;
  /** Lugares bonificados: entran todos, se cobran (cantidad - freeSpots). */
  freeSpots?: number;
  description?: string;
  active?: boolean;
}

/** Un horario propio: día ISO (1=lunes..7=domingo) + hora de inicio 'HH:mm'. */
export interface OwnSlot {
  weekday: number;
  start: string;
  /** Fecha única 'YYYY-MM-DD' (un evento): vale sólo ese día. */
  date?: string;
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
  /**
   * HORARIO PROPIO: si tiene alguno, la experiencia se ofrece SÓLO en estos
   * días y horas, no en los turnos generales (ej. Escuelita: miércoles 18:00).
   * Vacío = turnos generales.
   */
  ownSchedule?: OwnSlot[];
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
  /** ¿Incluye buffet/merienda? Cocina cuenta a sus personas. */
  hasBuffet?: boolean;
  // true = marca esta experiencia como el doc "Cumpleaños": hereda precio y
  // duración de la experiencia elegida y aporta sus beneficios (a lo sumo una).
  isBirthday?: boolean;
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
  /** De esas personas, cuántas van bonificadas (entran pero no se cobran). */
  freeSpots?: number;
  /** Hora extra (minutos) y su precio, que se suma como adicional. */
  extraMinutes?: number;
  extraAmount?: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  clientId?: string;
  paymentMethod: ReservationPaymentMethod;
  amount?: number;
  notes?: string;
  /** Cumpleaños: aplica los beneficios sobre el precio de la experiencia. */
  isBirthday?: boolean;
  dietaryTags?: string[];
  dietaryNotes?: string;
  kitchenNotes?: string;
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
    date?: string;
    status?: string;
    from?: string;
    to?: string;
    includePast?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.experienceId) q.set('experienceId', params.experienceId);
    if (params?.date) q.set('date', params.date);
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
  /** Agenda una venta del local: reserva vinculada, sin cobrar de nuevo. */
  scheduleSale: async (
    saleId: string,
    input: {
      experienceId: string;
      date: string;
      startTime: string;
      quantity: number;
      isBirthday?: boolean;
      notes?: string;
      dietaryTags?: string[];
      dietaryNotes?: string;
      kitchenNotes?: string;
      /** Personas bonificadas (entran pero no se cobran). */
      freeSpots?: number;
      /** Tortas de la venta para cocina: no suman, ya están en la venta. */
      cakes?: { label: string; qty: number; amount: number; notes?: string }[];
    },
  ) =>
    (
      await apiService.post<ReservationItem>(
        `/admin/reservations/from-sale/${saleId}`,
        input as unknown as Record<string, unknown>,
      )
    ).data,
  /**
   * Verificación del panel: como la pública, pero la reserva puede cruzar de
   * un turno al otro y sumar hora extra. Devuelve el motivo si no entra.
   */
  previewTables: async (input: {
    experienceId: string;
    date: string;
    startTime: string;
    quantity: number;
    extraMinutes?: number;
  }) =>
    (
      await apiService.post<PreviewTablesResult>(
        '/admin/reservations/preview',
        input as unknown as Record<string, unknown>,
      )
    ).data,
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
    date?: string;
    /** Rango por fecha de turno (YYYY-MM-DD), inclusive. */
    from?: string;
    to?: string;
    /** 'created' (recientes, default) | 'startAt' (por fecha de turno). */
    sort?: 'created' | 'startAt';
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.sessionId) q.set('sessionId', params.sessionId);
    if (params?.experienceId) q.set('experienceId', params.experienceId);
    if (params?.date) q.set('date', params.date);
    if (params?.from) q.set('from', params.from);
    if (params?.to) q.set('to', params.to);
    if (params?.sort) q.set('sort', params.sort);
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
      dietaryTags?: string[];
      dietaryNotes?: string;
      isBirthday?: boolean;
      kitchenNotes?: string;
      /** Sumar o descontar personas (ajusta total, saldo y mesas). */
      quantity?: number;
      freeSpots?: number;
      /** Hora extra en minutos (0 la quita) y lo que se cobra por sumarla. */
      extraMinutes?: number;
      extraAmount?: number;
    },
  ) =>
    (
      await apiService.patch<ReservationItem & { creditDue?: number }>(
        `/admin/reservations/${id}`,
        input,
      )
    ).data,
  /** Torta para cocina; con precio también suma como adicional al total. */
  addCake: async (
    id: string,
    input: { label: string; qty?: number; amount?: number; notes?: string },
  ) =>
    (
      await apiService.post<ReservationItem>(
        `/admin/reservations/${id}/cakes`,
        input as unknown as Record<string, unknown>,
      )
    ).data,
  removeCake: async (id: string, cakeId: string) =>
    (
      await apiService.delete<ReservationItem>(
        `/admin/reservations/${id}/cakes/${cakeId}`,
      )
    ).data,
  /** Comprobante del cliente: cobrar con él (transferencia) o descartarlo. */
  resolveReceipt: async (
    id: string,
    receiptId: string,
    input: { action: 'accept' | 'dismiss'; amount?: number },
  ) =>
    (
      await apiService.post<ReservationItem>(
        `/admin/reservations/${id}/receipts/${receiptId}/resolve`,
        input as unknown as Record<string, unknown>,
      )
    ).data,
  /** URL firmada (corta vida) de la imagen de un comprobante. */
  receiptImageUrl: async (key: string) =>
    (
      await apiService.get<{ url: string }>(
        `/leads/receipt-image?key=${encodeURIComponent(key)}`,
      )
    ).data.url,
  collectBalance: async (
    id: string,
    payments: { method: ReservationPaymentMethod; amount: number }[],
  ) =>
    (
      await apiService.post<ReservationItem>(
        `/admin/reservations/${id}/collect-balance`,
        // El backend cierra la venta cuando el saldo llega a 0.
        { payments },
      )
    ).data,
  /** Qué se cobra al pasar la reserva por Ventas → Nueva venta. */
  checkoutPlan: async (id: string) =>
    (await apiService.get<ReservationCheckoutPlan>(`/admin/reservations/${id}/checkout`)).data,
  /** Crea la venta del POS que cobra la reserva (la deja saldada). */
  checkout: async (id: string, sale: CreateSaleRequest) =>
    (
      await apiService.post<Sale>(
        `/admin/reservations/${id}/checkout`,
        sale as unknown as Record<string, unknown>,
      )
    ).data,
};

export interface ReservationCheckoutPlan {
  reservation: {
    _id: string;
    code: string;
    experienceName: string;
    startAt: string;
    quantity: number;
    totalAmount?: number;
    depositAmount?: number;
    balanceDue: number;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    clientId?: string;
  };
  /** Saldo de la venta de la seña, cobrado como abono dentro de la venta nueva. */
  settle: { saleId: string; saleNumber: string; amount: number } | null;
  items: { productId?: string; productName: string; quantity: number; unitPrice: number }[];
  /** Descuento si las líneas suman más que el saldo (cumpleaños, precio especial). */
  discount: number;
}
