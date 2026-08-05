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

export interface PieceItem {
  _id: string;
  customerPhone: string;
  customerName?: string;
  experienceName?: string;
  quantity: number;
  status: PieceStatus;
  notes?: string;
  /** Reserva a la que está asignada la pieza (camino normal). */
  reservationId?: string;
  reservationCode?: string;
  /** Profesor asignado al proceso. */
  professorId?: string;
  professorName?: string;
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
  professorId?: string;
  /** Camino manual (pieza sin reserva). */
  customerPhone?: string;
  customerName?: string;
  experienceName?: string;
  quantity?: number;
  status?: PieceStatus;
  notes?: string;
}

export const piecesAdmin = {
  list: async (params?: {
    status?: string;
    search?: string;
    professorId?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search?.trim()) q.set('search', params.search.trim());
    if (params?.professorId) q.set('professorId', params.professorId);
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
    input: Partial<CreatePieceInput> & { status?: PieceStatus },
  ) =>
    (
      await apiService.patch<PieceItem>(
        `/pieces/${id}`,
        input as unknown as Record<string, unknown>,
      )
    ).data,
  remove: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/pieces/${id}`)).data,
};
