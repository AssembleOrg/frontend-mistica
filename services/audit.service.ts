// services/audit.service.ts

import { apiService, ApiResponse } from './api.service';

export interface AuditLog {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  userEmail: string;
  ipAddress?: string;
  timestamp: string;
  newValues?: Record<string, any>;
}

export interface AuditLogsResponse {
  data: AuditLog[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export class AuditService {
  async getAuditLogs(page: number = 1, limit: number = 10, filters?: {
    entity?: string;
    action?: string;
    userEmail?: string;
    from?: string;
    to?: string;
  }): Promise<ApiResponse<AuditLogsResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters) {
      if (filters.entity && filters.entity.trim()) {
        params.append('entity', filters.entity.trim());
      }
      if (filters.action && filters.action.trim()) {
        params.append('action', filters.action.trim());
      }
      if (filters.userEmail && filters.userEmail.trim()) {
        params.append('userEmail', filters.userEmail.trim());
      }
      if (filters.from) {
        params.append('from', filters.from);
      }
      if (filters.to) {
        params.append('to', filters.to);
      }
    }

    const response = await apiService.get<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
    return response;
  }

  async getAuditLog(id: string): Promise<ApiResponse<AuditLog>> {
    const response = await apiService.get<AuditLog>(`/audit-logs/${id}`);
    return response;
  }
}

// Export singleton instance
export const auditService = new AuditService();

// Export types for external use
export type { AuditLogsResponse as AuditPaginatedResponse };
