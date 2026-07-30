// services/tables.admin.service.ts
//
// Cliente ADMIN de MESAS y TURNOS del salón (post-login, cookie auth).
//
// El salón trabaja en turnos fijos y las mesas se bloquean por turno: una mesa
// ocupada en el Turno 1 vuelve al pool en el Turno 2. El hueco entre turnos es
// el tiempo de limpieza.

import { apiService } from '@/services/api.service';

export type TableKind = 'SMALL' | 'LARGE';

export interface AdminTable {
  code: string;
  kind: TableKind;
  seats: number;
  order: number;
}

export interface Shift {
  key: string;
  name: string;
  /** Hora local 'HH:mm'. */
  start: string;
  end: string;
}

/** Quién ocupa una mesa en un turno (2 entradas si la grande está compartida). */
export interface TableHolder {
  reservationId?: string;
  qty: number;
  startAt?: string;
  endAt?: string;
  shared: boolean;
  /** Presente sólo en los bloqueos manuales (taller, evento, mesa rota). */
  label?: string;
}

export interface TableStatus {
  code: string;
  kind: TableKind;
  seats: number;
  occupied: boolean;
  holders: TableHolder[];
}

/** Una reserva del turno, con todas sus mesas juntas. */
export interface AgendaReservation {
  reservationId: string;
  code?: string;
  customerName: string;
  customerPhone?: string;
  experienceName: string;
  status?: string;
  qty: number;
  startAt?: string;
  endAt?: string;
  shared: boolean;
  tables: string[];
  /** Restricciones alimentarias del grupo (se ven en la agenda del día). */
  dietaryTags?: string[];
  dietaryNotes?: string;
}

export interface AgendaShift extends Shift {
  startAt: string;
  endAt: string;
  tables: TableStatus[];
  /** Grupo más grande que todavía entra en el turno (no suma de asientos). */
  remainingPartySize: number;
  reservations: AgendaReservation[];
  blocks: Array<{ table: string; label: string }>;
}

export const tablesAdmin = {
  list: async () => (await apiService.get<AdminTable[]>('/tables')).data,

  shifts: async () => (await apiService.get<Shift[]>('/tables/shifts')).data,

  /** Agenda de un día. `date` en formato YYYY-MM-DD (hora de Argentina). */
  agenda: async (date: string) =>
    (await apiService.get<AgendaShift[]>(`/tables/agenda?date=${date}`)).data,

  /** Cambia a mano las mesas de una reserva. Reemplaza la asignación actual. */
  reassign: async (input: { reservationId: string; tables: string[] }) =>
    (
      await apiService.post<{ tables: string[]; seats: number }>(
        '/tables/reassign',
        input as unknown as Record<string, unknown>,
      )
    ).data,

  blockTable: async (input: {
    date: string;
    shift: string;
    code: string;
    label: string;
  }) =>
    (
      await apiService.post<{ success: boolean }>(
        '/tables/block',
        input as unknown as Record<string, unknown>,
      )
    ).data,

  unblockTable: async (input: {
    date: string;
    shift: string;
    code: string;
    label?: string;
  }) =>
    (
      await apiService.post<{ success: boolean }>(
        '/tables/unblock',
        { label: 'Bloqueada', ...input } as unknown as Record<string, unknown>,
      )
    ).data,
};

/**
 * Plantilla de turno del día. Los turnos NO son por experiencia: existen solos
 * y en un mismo bloque conviven reservas de experiencias distintas. Definirlos
 * una vez alcanza; el turno concreto se crea solo cuando alguien reserva.
 */
export interface ShiftTemplate {
  _id: string;
  key: string;
  name: string;
  start: string;
  end: string;
  /** Día ISO 1=lunes … 7=domingo. Ausente = todos los días. */
  weekday?: number;
  /** Experiencias habilitadas. Vacío = todas las reservables. */
  experienceIds: string[];
  order: number;
  active: boolean;
}

export interface ShiftTemplateInput {
  key: string;
  name: string;
  start: string;
  end: string;
  weekday?: number;
  experienceIds?: string[];
  order?: number;
  active?: boolean;
}

export const shiftTemplatesAdmin = {
  list: async () =>
    (await apiService.get<ShiftTemplate[]>('/tables/shift-templates')).data,

  create: async (input: ShiftTemplateInput) =>
    (
      await apiService.post<ShiftTemplate>(
        '/tables/shift-templates',
        input as unknown as Record<string, unknown>,
      )
    ).data,

  update: async (id: string, input: Partial<ShiftTemplateInput>) =>
    (
      await apiService.patch<ShiftTemplate>(
        `/tables/shift-templates/${id}`,
        input,
      )
    ).data,

  remove: async (id: string) =>
    (
      await apiService.delete<{ success: boolean }>(
        `/tables/shift-templates/${id}`,
      )
    ).data,
};
