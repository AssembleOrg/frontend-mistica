// services/leads.admin.service.ts
//
// Cliente ADMIN de consultas/leads (post-login, cookie auth vía apiService).
// Las consultas las captan el bot de WhatsApp y la web para servicios que no se
// reservan online (cumpleaños, talleres mensuales, escuelita, facilitadores...).

import { apiService } from '@/services/api.service';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'CLOSED';
export type LeadSource = 'WHATSAPP' | 'WEB' | 'ADMIN';

export interface LeadItem {
  _id: string;
  service: string;
  experienceId?: string;
  preferredDate?: string;
  quantity?: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  source: LeadSource;
  status: LeadStatus;
  notes?: string;
  createdAt: string;
}

export interface LeadListResponse {
  items: LeadItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const leadsAdmin = {
  list: async (params?: {
    status?: string;
    source?: string;
    page?: number;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.source) q.set('source', params.source);
    q.set('page', String(params?.page ?? 1));
    q.set('limit', String(params?.limit ?? 20));
    return (await apiService.get<LeadListResponse>(`/leads?${q.toString()}`)).data;
  },
  update: async (
    id: string,
    input: { status?: LeadStatus; notes?: string },
  ) => (await apiService.patch<LeadItem>(`/leads/${id}`, input)).data,
};
