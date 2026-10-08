// services/taller.admin.service.ts
//
// Cliente del módulo TALLER (post-login, cookie auth vía apiService):
// alumnos (seguimiento administrativo y práctico), grupos/talleres/clases,
// pagos y regularidad, asistencia, tareas del personal y lista de compras.

import { apiService } from '@/services/api.service';

// ── Tipos ──────────────────────────────────────────────────────────────────

export interface GroupSlot {
  weekday: number; // ISO 1=lunes..7=domingo
  start: string; // 'HH:mm'
  end: string;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  professorId?: string;
  professorName?: string;
  schedule: GroupSlot[];
  studentIds: string[];
  notes?: string;
  isActive: boolean;
  /** Posición en el listado (la acomoda el admin arrastrando). */
  sortOrder?: number;
  /** ¿Sus alumnos llevan pieza del mes? (la Escuelita no). */
  hasMonthlyPiece?: boolean;
  /** Experiencias que se reservan para venir a este grupo (la Escuelita). */
  experienceIds?: string[];
  createdAt: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  professorId?: string;
  schedule?: GroupSlot[];
  studentIds?: string[];
  /** Clientes a sumar: el backend los da de alta como alumnos vinculados. */
  clientIds?: string[];
  /** Quien reserva estas experiencias queda como alumno del grupo. */
  experienceIds?: string[];
  notes?: string;
  isActive?: boolean;
  hasMonthlyPiece?: boolean;
}

export interface Student {
  _id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  phone?: string;
  email?: string;
  guardianName?: string;
  birthDate?: string;
  joinedAt: string;
  /** Día del mes límite para pagar la cuota (sin valor: el 10). */
  paymentDay?: number;
  /** Importe de la cuota mensual. */
  monthlyFee?: number;
  adminNotes?: string;
  practicalNotes?: string;
  isActive: boolean;
  /** Clase de prueba gratuita que ya usó (grupo y día). Sin valor = disponible. */
  trialGroupId?: string;
  trialDate?: string;
  createdAt: string;
}

export interface CreateStudentInput {
  name: string;
  clientId?: string;
  phone?: string;
  email?: string;
  guardianName?: string;
  birthDate?: string;
  joinedAt?: string;
  paymentDay?: number;
  monthlyFee?: number;
  adminNotes?: string;
  practicalNotes?: string;
  isActive?: boolean;
}

export interface StudentPayment {
  _id: string;
  studentId: string;
  concept: string;
  amount: number;
  status: 'PAID' | 'PENDING';
  paidAt?: string;
  dueDate?: string;
  method?: string;
  notes?: string;
  /** Cuota mensual: mes 'YYYY-MM' (la genera el sistema). */
  period?: string;
  createdAt: string;
}

export interface CreateStudentPaymentInput {
  concept: string;
  amount: number;
  status?: 'PAID' | 'PENDING';
  paidAt?: string;
  dueDate?: string;
  method?: string;
  notes?: string;
}

export interface StudentAdminProfile {
  student: Student;
  groups: Group[];
  payments: StudentPayment[];
  regularity: {
    upToDate: boolean;
    overdueCount: number;
    overdueAmount: number;
  };
  regularityHistory: Array<{
    _id: string;
    status: 'UP_TO_DATE' | 'OVERDUE';
    overdueCount: number;
    overdueAmount: number;
    source: string;
    createdAt: string;
  }>;
}

export interface StudentPracticalProfile {
  student: {
    id: string;
    name: string;
    practicalNotes?: string;
    isActive: boolean;
  };
  groups: Group[];
  attendance: Array<{
    groupId: string;
    dateKey: string;
    record?: {
      studentId: string;
      status: AttendanceStatus;
      makeupForGroupId?: string;
      makeupForDate?: string;
      recoveredInGroupId?: string;
      recoveredInDate?: string;
      recoveredAt?: string;
      notes?: string;
    };
  }>;
  pieces: Array<{
    _id: string;
    status: string;
    quantity: number;
    experienceName?: string;
    photos?: string[];
    notes?: string;
    pieceType?: string;
    colorsUsed?: string;
    createdAt: string;
  }>;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'MAKEUP';

export interface AttendanceDoc {
  _id: string;
  groupId: string;
  dateKey: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    makeupForGroupId?: string;
    makeupForDate?: string;
    recoveredInGroupId?: string;
    recoveredInDate?: string;
    recoveredAt?: string;
    notes?: string;
    /** Clase de prueba gratuita. */
    trial?: boolean;
  }>;
}

export interface PaymentAlert {
  paymentId: string;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  concept: string;
  amount: number;
  dueDate?: string;
  overdue: boolean;
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE';

export interface StaffTask {
  _id: string;
  title: string;
  description?: string;
  assigneeUserId?: string;
  assigneeName?: string;
  assignees?: Array<{ userId: string; name: string }>;
  status: TaskStatus;
  dueDate?: string;
  /** Cuándo se puso "En proceso". */
  startedAt?: string;
  completedAt?: string;
  comments?: Array<{
    _id: string;
    authorUserId?: string;
    authorName: string;
    body: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export interface ShoppingItem {
  _id: string;
  name: string;
  quantity?: string;
  notes?: string;
  status: 'PENDING' | 'BOUGHT';
  addedById?: string;
  addedByName?: string;
  /** Quién lo pidió (la persona; en cuentas compartidas se elige al cargar). */
  requestedByName?: string;
  boughtAt?: string;
  createdAt: string;
}

/**
 * Pieza del mes de un alumno (puede pedir más de una). Adicional y cobro sólo
 * llegan a admin/encargado.
 */
export interface MonthlyPiece {
  _id: string;
  month: string; // 'YYYY-MM'
  pieceName: string;
  /** Pieza del catálogo y su categoría (define el adicional). */
  pieceTypeId?: string;
  category?: string;
  /** Fresca y bizcocho se excluyen; las dos apagadas = sin elegir. */
  bisque: boolean;
  fresh: boolean;
  /** Cuándo la pidió: ordena la lista de Producción. */
  requestedAt?: string;
  /** Para qué clase la quiere ('YYYY-MM-DD'). */
  dueDate?: string;
  /** Producción la terminó (lista para entregar). */
  ready: boolean;
  readyAt?: string;
  delivered: boolean;
  notes?: string;
  extraCharge?: boolean;
  extraAmount?: number;
  /** Adicional bonificado: no se cobra. */
  waived?: boolean;
  paid?: boolean;
  /** Cuándo se cobró y hasta cuándo se puede deshacer desde el panel (24 hs). */
  paidAt?: string;
  paymentId?: string;
  undoUntil?: string;
  /** Quién hizo el último cambio. */
  updatedByName?: string;
}

export type MonthlyPieceInput = Partial<
  Pick<
    MonthlyPiece,
    | 'pieceName'
    | 'bisque'
    | 'fresh'
    | 'dueDate'
    | 'ready'
    | 'delivered'
    | 'notes'
    | 'extraCharge'
    | 'extraAmount'
    | 'waived'
    | 'paid'
  >
> & {
  /** Pieza del catálogo ('' la desvincula). */
  pieceTypeId?: string;
  paymentMethod?: string;
  /** Quién hace la gestión (cuentas compartidas); si no, la cuenta. */
  doneBy?: string;
};

/** Pieza de la lista de Producción (una fila por pieza). */
export interface MonthlyPieceRow {
  student: { _id: string; name: string };
  groups: Array<{ name: string; schedule: GroupSlot[] }>;
  piece: MonthlyPiece | null;
}

/** Fila de la planilla del mes: un alumno con sus piezas (una o más). */
export interface MonthlyPieceSheetRow {
  student: { _id: string; name: string };
  groups: Array<{ name: string; schedule: GroupSlot[] }>;
  pieces: MonthlyPiece[];
}

/** Clase de prueba agendada en un grupo. */
export interface TrialClass {
  _id: string;
  groupId: string;
  groupName: string;
  /** Hora de la clase ('18:00'). */
  start?: string;
  date: string; // 'YYYY-MM-DD'
  student: { _id: string; name: string; phone?: string };
  notes?: string;
  createdByName?: string;
  /** Vino (la asistencia marcó su prueba). */
  attended: boolean;
  /** Ya se inscribió en el grupo. */
  enrolled: boolean;
}

/**
 * Recuperación agendada: falta a una clase de su grupo (from) y la recupera en
 * la de otro grupo (to). SCHEDULED = todavía no se tomó asistencia ese día;
 * DONE = vino; MISSED = no vino y la clase original sigue pendiente.
 */
export interface MakeupClass {
  _id: string;
  student: { _id: string; name: string };
  fromGroupId: string;
  fromGroupName: string;
  fromStart?: string;
  fromDate: string;
  toGroupId: string;
  toGroupName: string;
  toStart?: string;
  toDate: string;
  notes?: string;
  createdByName?: string;
  status: 'SCHEDULED' | 'DONE' | 'MISSED';
}

/** Clase extra: un alumno suma una clase de otro grupo (doble turno). */
export interface ExtraClass {
  _id: string;
  student: { _id: string; name: string };
  groupId: string;
  groupName: string;
  start?: string;
  date: string;
  notes?: string;
  createdByName?: string;
}

export interface ScheduleMakeupInput {
  studentId: string;
  fromGroupId: string;
  fromDate: string;
  toGroupId: string;
  toDate: string;
  notes?: string;
  doneBy?: string;
}

export interface ScheduleTrialInput {
  groupId: string;
  date: string;
  studentId?: string;
  name?: string;
  phone?: string;
  notes?: string;
  doneBy?: string;
}

export interface EnrollTrialInput {
  /** Desde qué clase cursa y paga ('YYYY-MM-DD'). */
  startDate: string;
  paymentDay: number;
  monthlyFee?: number;
  /** Primera cuota (p. ej. el proporcional); si no, la cuota mensual. */
  firstAmount?: number;
}

type Json = Record<string, unknown>;

// ── API ────────────────────────────────────────────────────────────────────

export const tallerAdmin = {
  // Grupos (profesor: sólo los suyos; admin: todos)
  /** Clases del día con cuántos alumnos hay anotados (sin nombres). */
  groupsOfDay: async (date: string) =>
    (await apiService.get<GroupDayClass[]>(`/groups/agenda?date=${date}`)).data,
  listGroups: async (includeInactive = false) =>
    (
      await apiService.get<Group[]>(
        `/groups${includeInactive ? '?includeInactive=true' : ''}`,
      )
    ).data,
  /** Guarda el orden del listado (ids en el orden en que se ven). Admin. */
  reorderGroups: async (ids: string[]) =>
    (await apiService.patch<{ success: boolean }>('/groups/order', { ids })).data,
  createGroup: async (input: CreateGroupInput) =>
    (await apiService.post<Group>('/groups', input as unknown as Json)).data,
  updateGroup: async (id: string, input: Partial<CreateGroupInput>) =>
    (await apiService.patch<Group>(`/groups/${id}`, input as unknown as Json))
      .data,
  removeGroup: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/groups/${id}`)).data,

  // Alumnos
  listStudents: async (includeInactive = false) =>
    (
      await apiService.get<Student[]>(
        `/students${includeInactive ? '?includeInactive=true' : ''}`,
      )
    ).data,
  createStudent: async (input: CreateStudentInput) =>
    (await apiService.post<Student>('/students', input as unknown as Json))
      .data,
  updateStudent: async (id: string, input: Partial<CreateStudentInput>) =>
    (
      await apiService.patch<Student>(
        `/students/${id}`,
        input as unknown as Json,
      )
    ).data,
  removeStudent: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/students/${id}`)).data,
  adminProfile: async (id: string) =>
    (await apiService.get<StudentAdminProfile>(`/students/${id}/admin`)).data,
  practicalProfile: async (id: string) =>
    (
      await apiService.get<StudentPracticalProfile>(
        `/students/${id}/practical`,
      )
    ).data,

  // Pieza del mes
  monthlyPieces: async (month: string) =>
    (
      await apiService.get<MonthlyPieceSheetRow[]>(
        `/students/monthly-pieces?month=${month}`,
      )
    ).data,
  monthlyPiecesOf: async (studentId: string) =>
    (
      await apiService.get<MonthlyPiece[]>(
        `/students/${studentId}/monthly-pieces`,
      )
    ).data,
  /** La pieza del mes (la primera que pidió); si no tiene, la crea. */
  saveMonthlyPiece: async (
    studentId: string,
    month: string,
    input: MonthlyPieceInput,
  ) =>
    (
      await apiService.put<MonthlyPiece>(
        `/students/${studentId}/monthly-pieces/${month}`,
        input as unknown as Json,
      )
    ).data,
  /** Otra pieza del mismo mes. */
  addMonthlyPiece: async (
    studentId: string,
    month: string,
    input: MonthlyPieceInput,
  ) =>
    (
      await apiService.post<MonthlyPiece>(
        `/students/${studentId}/monthly-pieces/${month}`,
        input as unknown as Json,
      )
    ).data,
  /** Edita una pieza del mes puntual. */
  updateMonthlyPiece: async (pieceId: string, input: MonthlyPieceInput) =>
    (
      await apiService.patch<MonthlyPiece>(
        `/students/monthly-pieces/${pieceId}`,
        input as unknown as Json,
      )
    ).data,
  /** Lista de Producción: piezas pedidas, en el orden en que se pidieron. */
  productionList: async (includeDelivered = false) =>
    (
      await apiService.get<MonthlyPieceRow[]>(
        `/students/monthly-pieces/production${includeDelivered ? '?all=true' : ''}`,
      )
    ).data,
  /** Producción marca la pieza lista (terminada) o la desmarca. */
  setPieceReady: async (pieceId: string, ready: boolean) =>
    (
      await apiService.patch<MonthlyPiece>(
        `/students/monthly-pieces/${pieceId}/ready`,
        { ready },
      )
    ).data,
  /** Borra una pieza del mes (si su adicional no se cobró). */
  removeMonthlyPiece: async (pieceId: string) =>
    (
      await apiService.delete<{ success: boolean }>(
        `/students/monthly-pieces/${pieceId}`,
      )
    ).data,

  // Clases de prueba agendadas
  listTrials: async (params: { from?: string; to?: string; groupId?: string } = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => !!v) as [string, string][],
    ).toString();
    return (
      await apiService.get<TrialClass[]>(`/students/trials${q ? `?${q}` : ''}`)
    ).data;
  },
  scheduleTrial: async (input: ScheduleTrialInput) =>
    (await apiService.post<TrialClass>('/students/trials', input as unknown as Json))
      .data,
  cancelTrial: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/students/trials/${id}`)).data,
  // Recuperaciones: con grupo + día, las que llegan a esa clase y las que salen.
  // Clases extra (doble turno): aparecen en la lista de esa clase.
  listExtraClasses: async (params: { groupId?: string; date?: string; studentId?: string }) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => !!v) as [string, string][],
    ).toString();
    return (await apiService.get<ExtraClass[]>(`/extra-classes?${q}`)).data;
  },
  scheduleExtraClass: async (input: { studentId: string; groupId: string; date: string; notes?: string }) =>
    (await apiService.post<ExtraClass>('/extra-classes', input as unknown as Json)).data,
  cancelExtraClass: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/extra-classes/${id}`)).data,
  listMakeups: async (params: { groupId?: string; date?: string; studentId?: string }) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => !!v) as [string, string][],
    ).toString();
    return (await apiService.get<MakeupClass[]>(`/makeups?${q}`)).data;
  },
  scheduleMakeup: async (input: ScheduleMakeupInput) =>
    (await apiService.post<MakeupClass>('/makeups', input as unknown as Json)).data,
  cancelMakeup: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/makeups/${id}`)).data,
  enrollTrial: async (id: string, input: EnrollTrialInput) =>
    (
      await apiService.post<{ success: boolean; groupName: string }>(
        `/students/trials/${id}/enroll`,
        input as unknown as Json,
      )
    ).data,

  // Pagos
  addPayment: async (studentId: string, input: CreateStudentPaymentInput) =>
    (
      await apiService.post<StudentPayment>(
        `/students/${studentId}/payments`,
        input as unknown as Json,
      )
    ).data,
  /**
   * Cobra una cuota pendiente. Menos que su importe = pago parcial: queda
   * registrado lo cobrado y la cuota sigue pendiente por el saldo.
   */
  collectPayment: async (
    paymentId: string,
    input: { amount: number; method?: string; balanceDueDate?: string },
  ) =>
    (
      await apiService.post<{ paid: number; remaining: number }>(
        `/students/payments/${paymentId}/collect`,
        input as unknown as Json,
      )
    ).data,
  updatePayment: async (
    paymentId: string,
    input: Partial<CreateStudentPaymentInput>,
  ) =>
    (
      await apiService.patch<StudentPayment>(
        `/students/payments/${paymentId}`,
        input as unknown as Json,
      )
    ).data,
  removePayment: async (paymentId: string) =>
    (
      await apiService.delete<{ success: boolean }>(
        `/students/payments/${paymentId}`,
      )
    ).data,
  paymentAlerts: async (days = 7) =>
    (
      await apiService.get<PaymentAlert[]>(
        `/students/payment-alerts?days=${days}`,
      )
    ).data,

  // Asistencia
  saveAttendance: async (input: {
    groupId: string;
    date: string;
    records: Array<{
      studentId: string;
      status: AttendanceStatus;
      makeupForGroupId?: string;
      makeupForDate?: string;
      notes?: string;
      trial?: boolean;
    }>;
  }) =>
    (
      await apiService.post<AttendanceDoc>(
        '/students/attendance',
        input as unknown as Json,
      )
    ).data,
  attendanceOfGroup: async (groupId: string, limit = 30) =>
    (
      await apiService.get<AttendanceDoc[]>(
        `/students/attendance/of-group/${groupId}?limit=${limit}`,
      )
    ).data,

  // Tareas del personal
  listTasks: async (status?: 'PENDING' | 'DONE') =>
    (
      await apiService.get<StaffTask[]>(
        `/staff/tasks${status ? `?status=${status}` : ''}`,
      )
    ).data,
  createTask: async (input: {
    title: string;
    description?: string;
    assigneeUserIds?: string[];
    dueDate?: string;
  }) =>
    (await apiService.post<StaffTask>('/staff/tasks', input as unknown as Json))
      .data,
  updateTask: async (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      assigneeUserIds: string[];
      dueDate: string;
      status: TaskStatus;
    }>,
  ) =>
    (
      await apiService.patch<StaffTask>(
        `/staff/tasks/${id}`,
        input as unknown as Json,
      )
    ).data,
  removeTask: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/staff/tasks/${id}`)).data,
  addTaskComment: async (id: string, body: string) =>
    (
      await apiService.post<StaffTask>(
        `/staff/tasks/${id}/comments`,
        { body } as unknown as Json,
      )
    ).data,

  // Lista de compras
  listShopping: async (status?: 'PENDING' | 'BOUGHT') =>
    (
      await apiService.get<ShoppingItem[]>(
        `/staff/shopping${status ? `?status=${status}` : ''}`,
      )
    ).data,
  addShoppingItem: async (input: {
    name: string;
    quantity?: string;
    notes?: string;
    /** Cuentas compartidas: quién lo pide. */
    requestedBy?: string;
  }) =>
    (
      await apiService.post<ShoppingItem>(
        '/staff/shopping',
        input as unknown as Json,
      )
    ).data,
  updateShoppingItem: async (
    id: string,
    input: Partial<{
      name: string;
      quantity: string;
      notes: string;
      status: 'PENDING' | 'BOUGHT';
    }>,
  ) =>
    (
      await apiService.patch<ShoppingItem>(
        `/staff/shopping/${id}`,
        input as unknown as Json,
      )
    ).data,
  removeShoppingItem: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/staff/shopping/${id}`))
      .data,
};

export interface GroupDayClass {
  groupId: string;
  name: string;
  professorName?: string;
  start: string;
  end: string;
  /** Cuántos vienen ese día a una clase de prueba. */
  trials?: number;
  /** Alumnos de otros grupos que vienen a recuperar. */
  makeups?: number;
  /** Alumnos del grupo que avisaron que no vienen (recuperan otro día). */
  away?: number;
  /** Alumnos de otros grupos que suman esta clase como extra (doble turno). */
  extras?: number;
  /** Experiencias cuyas reservas son de este grupo (no van como turno aparte). */
  experienceIds?: string[];
  students: number;
}

export const WEEKDAY_SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
