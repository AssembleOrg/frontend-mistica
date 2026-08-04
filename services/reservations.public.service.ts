// services/reservations.public.service.ts
//
// Cliente del flujo PÚBLICO de reservas (landing). Pega al proxy `/api` de Next
// que reenvía al backend. Endpoints públicos (@Public en el backend), sin auth.

const BASE = '/api';

export interface PublicExperience {
  _id: string;
  name: string;
  description?: string;
  // Apodos con los que los clientes nombran la experiencia ("AYD", "CyB").
  // El bot los usa para reconocerla en la charla.
  aliases?: string[];
  durationMinutes: number;
  basePrice: number;
  defaultCapacity: number;
  depositPct?: number;
  // Color hex (#RRGGBB) para la agenda. Obligatorio al crear/editar; puede
  // faltar en docs viejos sin backfillear.
  color?: string;
  images: string[];
  isActive: boolean;
  // false = servicio coordinado (no se reserva online; solo info + consulta).
  bookableOnline?: boolean;
  // Lugares FIJOS del salón que ocupa un turno abierto (ej. mesa de taller = 10).
  // 0/ausente = el control del salón usa los anotados.
  venueSeats?: number;
}

export interface PublicSession {
  id: string;
  experienceId: string;
  experienceName: string;
  // Color actual de la experiencia (join dinámico del backend).
  experienceColor?: string;
  durationMinutes: number;
  price: number;
  depositPct: number;
  startAt: string;
  endAt: string;
  capacity: number;
  seatsTaken: number;
  seatsAvailable: number;
  status: string;
  notes?: string;
}

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'NEEDS_REVIEW';

export interface HoldResponse {
  reservationId: string;
  code: string;
  status: ReservationStatus;
  amount: number; // seña cobrada
  depositAmount: number;
  totalAmount: number;
  balanceDue: number;
  quantity: number;
  expiresAt?: string;
  paymentMethod: string;
  /** Minutos que dura el lugar apartado esperando el comprobante. */
  holdMinutes: number;
  /** Datos bancarios para transferir la seña (único medio de pago). */
  transfer: { alias: string; ownerName: string; bank: string };
  /** WhatsApp al que mandar la captura del comprobante (sin +). */
  whatsapp: string;
}

export interface ReservationView {
  reservationId: string;
  code: string;
  status: ReservationStatus;
  experienceName: string;
  startAt: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  depositAmount: number;
  totalAmount: number;
  balanceDue: number;
  paymentMethod: string;
  source: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  expiresAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  notes?: string;
  createdAt: string;
}

export interface CreateHoldInput {
  // Dos formas de decir QUÉ se reserva: un turno existente, o el trío
  // (experiencia, día, hora) — el turno se crea solo si hace falta.
  sessionId?: string;
  experienceId?: string;
  /** Día, YYYY-MM-DD. */
  date?: string;
  /** Hora local de inicio, 'HH:mm'. El horario es libre dentro de la ventana
   *  del negocio (apertura–cierre). */
  startTime?: string;
  /** Turno sugerido ('T1'): compat, se traduce a su hora de inicio. */
  shiftKey?: string;
  quantity: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  idempotencyKey: string;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = await res.json();
      message = body?.message ?? message;
    } catch {
      /* sin body json */
    }
    throw new Error(Array.isArray(message) ? message.join(', ') : String(message));
  }
  return (await res.json()) as T;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `idk-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Un horario sugerido reservable de un día concreto. */
export interface AvailableShift {
  dateKey: string;
  /** Hora local de inicio, 'HH:mm'. Es la clave del horario. */
  startTime: string;
  /** Turno sugerido en el que cae (etiqueta; puede faltar). */
  shiftKey?: string;
  shiftName?: string;
  /** Inicio y fin reales de la experiencia (ISO). */
  startAt: string;
  endAt: string;
  /** Grupo más grande que todavía entra. */
  maxPartySize: number;
  price: number;
  depositPct: number;
}

/** Respuesta del preview de mesas para un (día, hora, grupo). */
export interface PreviewTablesResult {
  fits: boolean;
  reason?: string;
  needsSharedConsent?: boolean;
  maxPartySize?: number;
  venueMaxPartySize?: number;
  tables?: string[];
  sharedTable?: boolean;
}

export const reservationsPublic = {
  listExperiences: () => req<PublicExperience[]>('/experiences/public'),

  listSessions: (experienceId?: string) =>
    req<PublicSession[]>(
      `/experience-sessions/public${experienceId ? `?experienceId=${experienceId}` : ''}`,
    ),

  /** Días y horarios sugeridos donde se puede reservar una experiencia. */
  availability: (experienceId: string, days = 45) =>
    req<AvailableShift[]>(
      `/reservations/availability?experienceId=${experienceId}&days=${days}`,
    ),

  /**
   * ¿Entra un grupo en (experiencia, día, hora)? No reserva nada. Sirve para
   * validar un horario libre elegido a mano antes de crear el hold.
   */
  previewTables: (input: {
    experienceId: string;
    date: string;
    startTime: string;
    quantity: number;
  }) =>
    req<PreviewTablesResult>('/reservations/preview-tables', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  createHold: (input: CreateHoldInput) =>
    req<HoldResponse>('/reservations/hold', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getStatus: (reservationId: string) =>
    req<ReservationView>(`/reservations/${reservationId}/status`),

  getByCode: (code: string) =>
    req<ReservationView>(`/reservations/code/${encodeURIComponent(code)}`),

  cancelByCode: (code: string) =>
    req<ReservationView>(
      `/reservations/code/${encodeURIComponent(code)}/cancel`,
      { method: 'POST' },
    ),
};
