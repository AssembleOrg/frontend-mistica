// services/settings.service.ts

import { apiService, type ApiResponse } from './api.service';
import { API_CONFIG } from '@/lib/api-config';

/**
 * Ajustes globales que viven en el backend (no en localStorage) porque son
 * sensibles / compartidos. Hoy: el PIN para borrar egresos.
 *
 * El backend nunca devuelve el PIN, sólo si está configurado. Configurarlo o
 * cambiarlo requiere la contraseña del admin (ver flujo en el componente de
 * seguridad).
 */
export class SettingsService {
  /** ¿Ya hay un PIN de borrado configurado? */
  async getCashDeletePinStatus(): Promise<ApiResponse<{ isSet: boolean }>> {
    return apiService.get<{ isSet: boolean }>(
      API_CONFIG.ENDPOINTS.SETTINGS.CASH_DELETE_PIN_STATUS,
    );
  }

  /** Configura / cambia / resetea el PIN. Requiere la contraseña del admin. */
  async setCashDeletePin(
    adminPassword: string,
    newPin: string,
  ): Promise<ApiResponse<{ ok: boolean }>> {
    return apiService.put<{ ok: boolean }>(
      API_CONFIG.ENDPOINTS.SETTINGS.CASH_DELETE_PIN,
      { adminPassword, newPin },
    );
  }
}

// Export singleton instance
export const settingsService = new SettingsService();
