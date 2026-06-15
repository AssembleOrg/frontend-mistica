import { apiService } from './api.service';

export interface ClientLabel {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLabelRequest {
  name: string;
  color?: string;
}

export interface UpdateLabelRequest {
  name?: string;
  color?: string;
}

class ClientLabelsService {
  async getLabels(): Promise<ClientLabel[]> {
    const response = await apiService.get<ClientLabel[]>('/client-labels');
    return response.data;
  }

  async createLabel(dto: CreateLabelRequest): Promise<ClientLabel> {
    const response = await apiService.post<ClientLabel>('/client-labels', dto as unknown as Record<string, unknown>);
    return response.data;
  }

  async updateLabel(id: string, dto: UpdateLabelRequest): Promise<ClientLabel> {
    const response = await apiService.patch<ClientLabel>(`/client-labels/${id}`, dto as unknown as Record<string, unknown>);
    return response.data;
  }

  async deleteLabel(id: string): Promise<void> {
    await apiService.delete<{ message: string }>(`/client-labels/${id}`);
  }
}

export const clientLabelsService = new ClientLabelsService();
