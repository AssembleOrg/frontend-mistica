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
  createdAt: string;
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  professorId?: string;
  schedule?: GroupSlot[];
  studentIds?: string[];
  notes?: string;
  isActive?: boolean;
}

export interface Student {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  guardianName?: string;
  birthDate?: string;
  joinedAt: string;
  adminNotes?: string;
  practicalNotes?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateStudentInput {
  name: string;
  phone?: string;
  email?: string;
  guardianName?: string;
  birthDate?: string;
  joinedAt?: string;
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
    record?: { studentId: string; status: AttendanceStatus; notes?: string };
  }>;
  pieces: Array<{
    _id: string;
    status: string;
    quantity: number;
    experienceName?: string;
    photos?: string[];
    notes?: string;
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
    notes?: string;
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

export interface StaffTask {
  _id: string;
  title: string;
  description?: string;
  assigneeUserId?: string;
  assigneeName?: string;
  status: 'PENDING' | 'DONE';
  dueDate?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ShoppingItem {
  _id: string;
  name: string;
  quantity?: string;
  notes?: string;
  status: 'PENDING' | 'BOUGHT';
  addedByName?: string;
  boughtAt?: string;
  createdAt: string;
}

type Json = Record<string, unknown>;

// ── API ────────────────────────────────────────────────────────────────────

export const tallerAdmin = {
  // Grupos (profesor: sólo los suyos; admin: todos)
  listGroups: async (includeInactive = false) =>
    (
      await apiService.get<Group[]>(
        `/groups${includeInactive ? '?includeInactive=true' : ''}`,
      )
    ).data,
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

  // Pagos
  addPayment: async (studentId: string, input: CreateStudentPaymentInput) =>
    (
      await apiService.post<StudentPayment>(
        `/students/${studentId}/payments`,
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
      notes?: string;
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
    assigneeUserId?: string;
    dueDate?: string;
  }) =>
    (await apiService.post<StaffTask>('/staff/tasks', input as unknown as Json))
      .data,
  updateTask: async (
    id: string,
    input: Partial<{
      title: string;
      description: string;
      assigneeUserId: string;
      dueDate: string;
      status: 'PENDING' | 'DONE';
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

export const WEEKDAY_SHORT = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
