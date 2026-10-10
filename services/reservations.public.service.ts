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
  /** ¿Incluye buffet/merienda? Cocina cuenta a sus personas. */
  hasBuffet?: boolean;
  /**
   * Es la ocasión "Cumpleaños": no se reserva directo, envuelve a la
   * experiencia elegida (hereda precio/duración) y aporta beneficios.
   */
  isBirthday?: boolean;
  /**
   * HORARIO PROPIO: si tiene alguno, la experiencia se ofrece SÓLO en estos
   * días y horas, no en los turnos generales (ej. Escuelita: miércoles 18:00).
   * weekday ISO: 1=lunes … 7=domingo.
   */
  ownSchedule?: Array<{ weekday: number; start: string; date?: string }>;
  /** Variantes de precio (modalidades, tiers por cantidad y promos por día/fecha). */
  priceVariants?: Array<{
    name: string;
    /** Ausente = beneficio puro: mantiene el precio heredado. */
    price?: number;
    unit: 'PER_PERSON' | 'FLAT';
    minQty?: number;
    maxQty?: number;
    /** Días de semana ISO (1=lunes..7=domingo) en los que rige. */
    days?: number[];
    dateFrom?: string;
    dateTo?: string;
    /** Lugares bonificados: entran todos, se cobran (cantidad - freeSpots). */
    freeSpots?: number;
    description?: string;
    active?: boolean;
  }>;
  /** Ediciones especiales por fecha (Halloween, Navidad…). Ver SpecialEdition. */
  specials?: SpecialEdition[];
}

/** PROXIMA: todavía no abrió reservas. VIGENTE: se reserva. FINALIZADA: ya pasó. */
export type SpecialStatus = 'PROXIMA' | 'VIGENTE' | 'FINALIZADA';

/**
 * Edición especial de una experiencia (Halloween, Navidad…): entre dateFrom y
 * dateTo la experiencia ES esta edición — texto, precio, bonos, extras y
 * horarios propios — y la versión habitual no se ofrece esos días.
 */
export interface SpecialEdition {
  _id?: string;
  name: string;
  /** Activadores del bot: cómo la piden los clientes ('halloween'). */
  aliases?: string[];
  /** Texto de la edición (reemplaza la descripción de la experiencia). */
  description?: string;
  /** Primer y último día en que se hace ('YYYY-MM-DD'; iguales = un día). */
  dateFrom: string;
  dateTo: string;
  /** Desde cuándo se ofrece y se reserva. Sin valor, apenas se carga. */
  announceFrom?: string;
  /** Precio por persona de la edición. Sin valor, el de la experiencia. */
  price?: number;
  /** Bonos de la edición: reemplazan a las promos habituales en sus fechas. */
  priceVariants?: NonNullable<PublicExperience['priceVariants']>;
  /** Lo que incluye sin costo. */
  included?: string[];
  /** Extras opcionales con precio (los suma el equipo a la reserva). */
  extras?: Array<{ name: string; price: number; description?: string }>;
  /** Horarios especiales; sin `date`, todos los días de la edición. */
  schedule?: Array<{ start: string; date?: string }>;
  active?: boolean;
  /** Estado de hoy (sólo viene en el catálogo público). */
  status?: SpecialStatus;
}

export interface PublicSession {
  id: string;
  experienceId: string;
  experienceName: string;
  // Color actual de la experiencia (join dinámico del backend).
  experienceColor?: string;
  durationMinutes: number;
  /** En un día de edición especial, el precio de la edición. */
  price: number;
  /** Edición especial que rige ese día (Halloween…), si hay. */
  specialName?: string;
  depositPct: number;
  startAt: string;
  endAt: string;
  capacity: number;
  seatsTaken: number;
  // Personas CONFIRMADAS del turno (sin holds pendientes). La Agenda cuenta
  // esto; `seatsTaken` sigue incluyendo pendientes para no sobrevender.
  confirmedSeats?: number;
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

// Vista pública (sin datos personales): el código o el id se pueden adivinar.
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
  expiresAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
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
  /** Cumpleaños: aplica los beneficios sobre el precio de la experiencia. */
  isBirthday?: boolean;
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
  /** En un día de edición especial ya es el precio de la edición. */
  price: number;
  depositPct: number;
  /** Edición especial que rige ese día (Halloween…), si hay. */
  special?: { id?: string; name: string };
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
  /** Montos server-side (mismos que se cobran), con promo aplicada si hay. */
  pricing?: {
    unitPrice: number;
    totalAmount: number;
    depositAmount: number;
    balanceDue: number;
    variantName?: string;
    variantDescription?: string;
    /** Lugares bonificados por la promo (entran pero no se cobran). */
    freeSpots?: number;
  };
}

export const reservationsPublic = {
  listExperiences: () => req<PublicExperience[]>('/experiences/public'),

  /** Horario del salón: desde y hasta qué hora se toman reservas. */
  businessHours: () =>
    req<{ open: string; close: string }>('/reservations/business-hours'),

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
    isBirthday?: boolean;
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
    req<ReservationView>(`/reservations/${encodeURIComponent(reservationId)}/status`),

  getByCode: (code: string) =>
    req<ReservationView>(`/reservations/code/${encodeURIComponent(code)}`),

  cancelByCode: (code: string) =>
    req<ReservationView>(
      `/reservations/code/${encodeURIComponent(code)}/cancel`,
      { method: 'POST' },
    ),
};
