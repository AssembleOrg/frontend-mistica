// services/app.service.ts

import { apiService, ApiResponse } from './api.service';

// Response types for app endpoints
export interface HealthResponse {
  status: string;
  timestamp: string;
  uptime?: number;
}

export interface DatabaseInfoResponse {
  database: {
    type: string;
    status: string;
    connections?: number;
  };
  version?: string;
  tables?: string[];
}

export class AppService {
  // Get application health status
  async getHealth(): Promise<ApiResponse<HealthResponse>> {
    return apiService.get<HealthResponse>('/health');
  }

  // Get database information
  async getDatabaseInfo(): Promise<ApiResponse<DatabaseInfoResponse>> {
    return apiService.get<DatabaseInfoResponse>('/db-info');
  }

  // Get hello message (basic endpoint)
  async getHello(): Promise<ApiResponse<string>> {
    return apiService.get<string>('/');
  }
}

// Export singleton instance
export const appService = new AppService();