// services/reservations.public.service.ts
//
// Cliente del flujo PÚBLICO de reservas (landing). Pega al proxy `/api` de Next
// que reenvía al backend. Endpoints públicos (@Public en el backend), sin auth.

const BASE = '/api';

export interface PublicExperience {
  _id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  basePrice: number;
  defaultCapacity: number;
  depositPct?: number;
  images: string[];
  isActive: boolean;
}

export interface PublicSession {
  id: string;
  experienceId: string;
  experienceName: string;
  durationMinutes: number;
  price: number;
  depositPct: number;
  startAt: string;
  endAt: string;
  capacity: number;
  seatsTaken: number;
  seatsAvailable: number;
  status: string;
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
  initPoint?: string;
  preferenceId?: string;
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
  sessionId: string;
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

export const reservationsPublic = {
  listExperiences: () => req<PublicExperience[]>('/experiences/public'),

  listSessions: (experienceId?: string) =>
    req<PublicSession[]>(
      `/experience-sessions/public${experienceId ? `?experienceId=${experienceId}` : ''}`,
    ),

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
