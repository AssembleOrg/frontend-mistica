// services/pieces.admin.service.ts
//
// Cliente ADMIN de piezas de cerámica (post-login, cookie auth vía apiService).

import { apiService } from '@/services/api.service';

export type PieceStatus =
  | 'SECADO'
  | 'PRIMERA_HORNEADA'
  | 'ESMALTADO'
  | 'SEGUNDA_HORNEADA'
  | 'LISTA'
  | 'RETIRADA';

export const PIECE_STATUS_ORDER: PieceStatus[] = [
  'SECADO',
  'PRIMERA_HORNEADA',
  'ESMALTADO',
  'SEGUNDA_HORNEADA',
  'LISTA',
  'RETIRADA',
];

export const PIECE_STATUS_LABEL: Record<PieceStatus, string> = {
  SECADO: 'En secado',
  PRIMERA_HORNEADA: 'Primera horneada',
  ESMALTADO: 'Esmaltado',
  SEGUNDA_HORNEADA: 'Segunda horneada',
  LISTA: 'Lista para retirar',
  RETIRADA: 'Retirada',
};

export interface PieceStatusConfig {
  key: string;
  label: string;
  /** Al entrar acá se avisa al cliente que está lista (una vez). */
  isReady?: boolean;
  /** Cierra el ciclo (entregada/retirada). */
  isFinal?: boolean;
}

export interface PieceItem {
  _id: string;
  customerPhone: string;
  customerName?: string;
  experienceName?: string;
  quantity: number;
  /** Clave de estado (configurable: ver piecesAdmin.statuses()). */
  status: string;
  notes?: string;
  /** Reserva a la que está asignada la pieza (camino normal). */
  reservationId?: string;
  reservationCode?: string;
  /** Profesor asignado al proceso. */
  professorId?: string;
  professorName?: string;
  /** Alumno del taller al que pertenece (piezas de alumnos). */
  studentId?: string;
  studentName?: string;
  /** Registro fotográfico (URLs). */
  photos?: string[];
  readyAt?: string;
  pickedUpAt?: string;
  createdAt: string;
}

export interface PieceListResponse {
  items: PieceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreatePieceInput {
  /** Camino normal: asignar a una reserva (contacto y experiencia salen de ahí). */
  reservationId?: string;
  /** Piezas de alumnos del taller. */
  studentId?: string;
  professorId?: string;
  photos?: string[];
  /** Camino manual (pieza sin reserva). */
  customerPhone?: string;
  customerName?: string;
  experienceName?: string;
  quantity?: number;
  status?: string;
  notes?: string;
}

export const piecesAdmin = {
  list: async (params?: {
    status?: string;
    search?: string;
    professorId?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search?.trim()) q.set('search', params.search.trim());
    if (params?.professorId) q.set('professorId', params.professorId);
    if (params?.studentId) q.set('studentId', params.studentId);
    q.set('page', String(params?.page ?? 1));
    q.set('limit', String(params?.limit ?? 20));
    return (await apiService.get<PieceListResponse>(`/pieces?${q.toString()}`))
      .data;
  },
  create: async (input: CreatePieceInput) =>
    (
      await apiService.post<PieceItem>(
        '/pieces',
        input as unknown as Record<string, unknown>,
      )
    ).data,
  update: async (
    id: string,
    input: Partial<CreatePieceInput> & { status?: string },
  ) =>
    (
      await apiService.patch<PieceItem>(
        `/pieces/${id}`,
        input as unknown as Record<string, unknown>,
      )
    ).data,
  remove: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/pieces/${id}`)).data,
  /** Estados vigentes del proceso (configurables por el taller). */
  statuses: async () =>
    (await apiService.get<PieceStatusConfig[]>('/pieces/statuses')).data,
  /** Reemplaza los estados (sólo admin). */
  setStatuses: async (statuses: PieceStatusConfig[]) =>
    (
      await apiService.patch<PieceStatusConfig[]>('/pieces/statuses', {
        statuses,
      } as unknown as Record<string, unknown>)
    ).data,
};
