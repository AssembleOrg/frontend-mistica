// services/tables.admin.service.ts
//
// Cliente ADMIN de MESAS y HORARIOS del salón (post-login, cookie auth).
//
// El horario es LIBRE: una reserva puede arrancar a cualquier hora dentro de
// la ventana del negocio (apertura–cierre). Las mesas se bloquean por
// INTERVALO: quedan tomadas de startAt a busyUntil (= fin + limpieza). Los
// turnos quedan sólo como sugerencia de horario.

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

/** Una ocupación de la mesa en el día (reserva o bloqueo manual). */
export interface TableHolder {
  reservationId?: string;
  qty: number;
  startAt?: string;
  endAt?: string;
  /** Fin real de la ocupación (fin + limpieza). */
  busyUntil?: string;
  shared: boolean;
  /** Presente sólo en los bloqueos manuales (taller, evento, mesa rota). */
  label?: string;
  /** true = viene de un bloqueo fijo semanal (se edita en su panel). */
  recurring?: boolean;
}

export interface TableStatus {
  code: string;
  kind: TableKind;
  seats: number;
  occupied: boolean;
  /** Ocupaciones del día en orden cronológico. */
  holders: TableHolder[];
}

/** Una reserva del día, con todas sus mesas juntas. */
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
  busyUntil?: string;
  shared: boolean;
  tables: string[];
  /** Restricciones alimentarias del grupo (se ven en la agenda del día). */
  dietaryTags?: string[];
  dietaryNotes?: string;
}

/** Agenda completa del día: línea de tiempo entre la apertura y el cierre. */
export interface DayAgenda {
  date: string;
  /** Ventana de reservas en hora local ('HH:mm'). */
  open: string;
  close: string;
  openAt: string;
  closeAt: string;
  /** Minutos de limpieza que se agregan al final de cada reserva. */
  cleaningMinutes: number;
  /** Turnos sugeridos del día (referencia visual, no restringen). */
  suggestedShifts: Shift[];
  tables: TableStatus[];
  reservations: AgendaReservation[];
  blocks: Array<{
    table: string;
    label: string;
    startAt?: string;
    endAt?: string;
    /** true = bloqueo fijo semanal; se edita en su panel, no acá. */
    recurring?: boolean;
    recurringId?: string;
  }>;
}

export const tablesAdmin = {
  list: async () => (await apiService.get<AdminTable[]>('/tables')).data,

  shifts: async () => (await apiService.get<Shift[]>('/tables/shifts')).data,

  /** Agenda de un día. `date` en formato YYYY-MM-DD (hora de Argentina). */
  agenda: async (date: string) =>
    (await apiService.get<DayAgenda>(`/tables/agenda?date=${date}`)).data,

  /** Cambia a mano las mesas de una reserva. Reemplaza la asignación actual. */
  reassign: async (input: { reservationId: string; tables: string[] }) =>
    (
      await apiService.post<{ tables: string[]; seats: number }>(
        '/tables/reassign',
        input as unknown as Record<string, unknown>,
      )
    ).data,

  /**
   * Bloquea una o varias mesas en un rango horario (todo-o-nada). Sin
   * `start`/`end` bloquea la ventana completa del día.
   */
  blockTable: async (input: {
    date: string;
    codes: string[];
    label: string;
    /** Hora local 'HH:mm'. */
    start?: string;
    end?: string;
  }) =>
    (
      await apiService.post<{ success: boolean }>(
        '/tables/block',
        input as unknown as Record<string, unknown>,
      )
    ).data,

  /**
   * Quita bloqueos manuales de una mesa. Con `start` quita sólo el bloqueo
   * que empieza a esa hora; sin él, todos los del día.
   */
  unblockTable: async (input: { date: string; code: string; start?: string }) =>
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

/**
 * Bloqueo FIJO semanal de mesas: un motivo o experiencia (taller, colonia)
 * que ocupa ciertas mesas todas las semanas en un día y rango horario. Baja
 * la disponibilidad de esos días automáticamente.
 */
export interface RecurringBlock {
  _id: string;
  label: string;
  /** Día ISO 1=lunes … 7=domingo. */
  weekday: number;
  /** Hora local 'HH:mm'. */
  start: string;
  end: string;
  tableCodes: string[];
  notes?: string;
  active: boolean;
}

export interface RecurringBlockInput {
  label: string;
  weekday: number;
  start: string;
  end: string;
  tableCodes: string[];
  notes?: string;
  active?: boolean;
}

export const recurringBlocksAdmin = {
  list: async () =>
    (await apiService.get<RecurringBlock[]>('/tables/recurring-blocks')).data,

  create: async (input: RecurringBlockInput) =>
    (
      await apiService.post<RecurringBlock>(
        '/tables/recurring-blocks',
        input as unknown as Record<string, unknown>,
      )
    ).data,

  update: async (id: string, input: Partial<RecurringBlockInput>) =>
    (
      await apiService.patch<RecurringBlock>(
        `/tables/recurring-blocks/${id}`,
        input,
      )
    ).data,

  remove: async (id: string) =>
    (
      await apiService.delete<{ success: boolean }>(
        `/tables/recurring-blocks/${id}`,
      )
    ).data,
};

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
