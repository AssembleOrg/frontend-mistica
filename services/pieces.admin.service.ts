// services/pieces.admin.service.ts
//
// Cliente ADMIN de piezas de cerámica (post-login, cookie auth vía apiService).

import { apiService } from '@/services/api.service';

export type PieceStatus =
  | 'PENDIENTE'
  | 'SECADO'
  | 'PRIMERA_HORNEADA'
  | 'ESMALTADO'
  | 'SEGUNDA_HORNEADA'
  | 'LISTA'
  | 'RETIRADA';

export const PIECE_STATUS_ORDER: PieceStatus[] = [
  'PENDIENTE',
  'LISTA',
  'RETIRADA',
];

export const PIECE_STATUS_LABEL: Record<PieceStatus, string> = {
  PENDIENTE: 'En preparación',
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
  personName?: string;
  signature?: string;
  pieceType?: string;
  colorsUsed?: string;
  /** Quién cargó la ficha (la persona, en cuentas compartidas). */
  registeredByName?: string;
  /** Adicional elegido al registrar la ficha (copia del catálogo). */
  extraName?: string;
  extraAmount?: number;
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
  notifiedReadyAt?: string;
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

export interface PieceCountsResponse {
  total: number;
  byStatus: Record<string, number>;
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

export interface ReservationPieceEntryInput {
  personName: string;
  signature: string;
  pieceType: string;
  colorsUsed: string;
  /** Adicional del catálogo: su monto se suma al saldo de la reserva. */
  extraId?: string;
  /** 2x1: la segunda pieza, que va en la misma ficha (una sola paleta). */
  pieceType2?: string;
  /** Pieza sumada además de la incluida: se cobra el precio de pieza adicional. */
  additional?: boolean;
}

/** Adicional de pieza (Incluida, Especial, Premium, 2x1…) con su monto. */
export interface PieceExtraItem {
  id: string;
  name: string;
  amount: number;
  /** 2x1: se eligen dos piezas de esta categoría para una sola ficha. */
  pair?: boolean;
  /** Precio si la pieza se suma además de la incluida (sin valor: el monto). */
  addAmount?: number;
  /** Material que no es cerámica (Tela, Bastidor…): sin firma ni colores. */
  material?: string;
}

export interface PieceExtraInput {
  name: string;
  amount: number;
  pair?: boolean;
  addAmount?: number;
  /** '' = cerámica. */
  material?: string;
}

/** Ítem del catálogo de piezas (taza, bowl, plato…). */
export interface PieceTypeItem {
  id: string;
  name: string;
  /** Categoría: el adicional que le corresponde (lo pone admin/encargado). */
  extraId?: string;
}

/** Una ficha por alumno del grupo. */
export interface GroupPieceEntryInput {
  studentId: string;
  personName: string;
  signature: string;
  pieceType: string;
  colorsUsed: string;
}

/** Campos editables de una pieza ya cargada. */
export interface UpdatePieceInput {
  status?: string;
  quantity?: number;
  personName?: string;
  signature?: string;
  pieceType?: string;
  colorsUsed?: string;
  customerName?: string;
  experienceName?: string;
  notes?: string;
  professorId?: string;
  studentId?: string;
  photos?: string[];
}

export const piecesAdmin = {
  list: async (params?: {
    status?: string;
    search?: string;
    professorId?: string;
    studentId?: string;
    reservationId?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search?.trim()) q.set('search', params.search.trim());
    if (params?.professorId) q.set('professorId', params.professorId);
    if (params?.studentId) q.set('studentId', params.studentId);
    if (params?.reservationId) q.set('reservationId', params.reservationId);
    q.set('page', String(params?.page ?? 1));
    q.set('limit', String(params?.limit ?? 20));
    return (await apiService.get<PieceListResponse>(`/pieces?${q.toString()}`))
      .data;
  },
  counts: async (params?: { search?: string; professorId?: string }) => {
    const q = new URLSearchParams();
    if (params?.search?.trim()) q.set('search', params.search.trim());
    if (params?.professorId) q.set('professorId', params.professorId);
    const suffix = q.size ? `?${q.toString()}` : '';
    return (await apiService.get<PieceCountsResponse>(`/pieces/counts${suffix}`))
      .data;
  },
  create: async (input: CreatePieceInput) =>
    (
      await apiService.post<PieceItem>(
        '/pieces',
        input as unknown as Record<string, unknown>,
      )
    ).data,
  /** `registeredBy`: quién carga (cuentas compartidas); si no, la cuenta. */
  createReservationBatch: async (
    reservationId: string,
    entries: ReservationPieceEntryInput[],
    registeredBy?: string,
  ) =>
    (
      await apiService.post<PieceItem[]>(
        '/pieces/reservation-batch',
        {
          reservationId,
          entries,
          ...(registeredBy ? { registeredBy } : {}),
        } as unknown as Record<string, unknown>,
      )
    ).data,
  createGroupBatch: async (
    groupId: string,
    entries: GroupPieceEntryInput[],
    registeredBy?: string,
  ) =>
    (
      await apiService.post<PieceItem[]>(
        '/pieces/group-batch',
        {
          groupId,
          entries,
          ...(registeredBy ? { registeredBy } : {}),
        } as unknown as Record<string, unknown>,
      )
    ).data,
  update: async (id: string, input: UpdatePieceInput) =>
    (
      await apiService.patch<PieceItem>(
        `/pieces/${id}`,
        input as unknown as Record<string, unknown>,
      )
    ).data,
  remove: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/pieces/${id}`)).data,
  /** Catálogo de piezas para "Pieza elegida". */
  listTypes: async () =>
    (await apiService.get<PieceTypeItem[]>('/pieces/types')).data,
  /** `extraId`: categoría ('' la quita; sin enviar, no la toca). */
  createType: async (name: string, extraId?: string) =>
    (
      await apiService.post<PieceTypeItem>('/pieces/types', {
        name,
        ...(extraId !== undefined && { extraId }),
      })
    ).data,
  updateType: async (id: string, name: string, extraId?: string) =>
    (
      await apiService.patch<PieceTypeItem>(`/pieces/types/${id}`, {
        name,
        ...(extraId !== undefined && { extraId }),
      })
    ).data,
  removeType: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/pieces/types/${id}`)).data,
  /** Adicionales de pieza (su monto se suma a la reserva). */
  listExtras: async () =>
    (await apiService.get<PieceExtraItem[]>('/pieces/extras')).data,
  createExtra: async (input: PieceExtraInput) =>
    (await apiService.post<PieceExtraItem>('/pieces/extras', input as unknown as Record<string, unknown>)).data,
  updateExtra: async (id: string, input: PieceExtraInput) =>
    (await apiService.patch<PieceExtraItem>(`/pieces/extras/${id}`, input as unknown as Record<string, unknown>)).data,
  /** Carga el catálogo completo (crea o actualiza por nombre, no borra). */
  importCatalog: async (input: {
    categories: Array<{ name: string; amount: number; addAmount?: number; pair?: boolean; material?: string }>;
    types: Array<{ name: string; category: string }>;
  }) =>
    (
      await apiService.post<{
        categoriesCreated: number;
        categoriesUpdated: number;
        typesCreated: number;
        typesUpdated: number;
      }>('/pieces/catalog/import', input as unknown as Record<string, unknown>)
    ).data,
  removeExtra: async (id: string) =>
    (await apiService.delete<{ success: boolean }>(`/pieces/extras/${id}`)).data,
  notifyReady: async (id: string) =>
    (await apiService.post<PieceItem>(`/pieces/${id}/notify-ready`, {})).data,
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
