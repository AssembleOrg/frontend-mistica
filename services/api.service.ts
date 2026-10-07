// services/api.service.ts

import type { paths } from '@/lib/api-types';
import { API_CONFIG } from '@/lib/api-config';
import { getApiBaseUrl } from '@/lib/api/base-url';

// Base API response interface
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

// API Error interface
export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

// HTTP client configuration
interface HttpConfig {
  headers?: Record<string, string>;
  timeout?: number;
}

// Anti-spam protection
interface RequestCache {
  [key: string]: {
    timestamp: number;
    promise?: Promise<any>;
  };
}

export class ApiService {
  private baseURL: string;
  private defaultTimeout: number = 10000; // 10 seconds
  private requestCache: RequestCache = {};
  private readonly CACHE_DURATION = 500; // 0.5 second protection for most requests
  private readonly CACHE_DURATION_GET = 200; // 0.2 second for GET requests (edit pages)
  private readonly MAX_CONCURRENT_REQUESTS = 15;
  private activeRequests = 0;

  constructor(baseURL: string = getApiBaseUrl()) {
    // En cliente: `/api` (relativo, va al Route Handler de Next).
    // En server (SSR/RSC): URL absoluta al backend (private domain o localhost).
    this.baseURL = baseURL;
  }

  // Build headers; auth viaja en cookie httpOnly (no header).
  private buildHeaders(customHeaders?: Record<string, string>): HeadersInit {
    return {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
  }

  // Handle API responses and errors
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // NestJS devuelve `message` como array cuando falla class-validator
      // (["category must be a string"]). Lo aplanamos acá para que el resto
      // de la app siempre reciba un string.
      const rawMessage = data?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join('. ')
        : rawMessage || `HTTP error! status: ${response.status}`;

      const apiError: ApiError = {
        message,
        status: response.status,
        code: data.code,
        details: data.details || data,
      };
      throw apiError;
    }

    return {
      data: data.data || data,
      status: response.status,
      message: data.message || 'Success',
    };
  }

  // Anti-spam protection
  private isRequestAllowed(endpoint: string, method: string = 'GET'): boolean {
    const requestKey = `${method}:${endpoint}`;
    const cached = this.requestCache[requestKey];
    const now = Date.now();

    // Use different cache durations based on method and endpoint
    const cacheDuration = method === 'GET' ? this.CACHE_DURATION_GET : this.CACHE_DURATION;
    
    // Special exception for critical endpoints (edit pages)
    const isCriticalEndpoint = endpoint.includes('/products/') && method === 'GET';
    if (isCriticalEndpoint && cached && (now - cached.timestamp) < this.CACHE_DURATION_GET) {
      // Allow but update timestamp to prevent rapid successive calls
      this.requestCache[requestKey] = { timestamp: now };
      return true;
    }

    // Check if same request was made recently (spam protection)
    // if (cached && (now - cached.timestamp) < cacheDuration) {
    //   console.warn(`🛡️ API: Request bloqueado por spam protection: ${requestKey} (${cacheDuration}ms protection)`);
    //   return false;
    // }

    // Check max concurrent requests
    if (this.activeRequests >= this.MAX_CONCURRENT_REQUESTS) {
      console.warn(`🛡️ API: Request bloqueado por límite de concurrencia: ${this.activeRequests}`);
      return false;
    }

    return true;
  }

  // Update request cache
  private updateRequestCache(endpoint: string, method: string = 'GET', promise?: Promise<any>): void {
    const requestKey = `${method}:${endpoint}`;
    this.requestCache[requestKey] = {
      timestamp: Date.now(),
      promise
    };
  }

  // Generic HTTP request method with protection
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    config: HttpConfig = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    const method = options.method || 'GET';
    
    // Anti-spam protection
    if (!this.isRequestAllowed(endpoint, method)) {
      throw {
        message: 'Request blocked by anti-spam protection',
        status: 429,
        code: 'RATE_LIMITED',
      } as ApiError;
    }

    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();

    // Set up timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, config.timeout || this.defaultTimeout);

    // Update cache and increment active requests
    this.updateRequestCache(endpoint, method);
    this.activeRequests++;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: this.buildHeaders(config.headers),
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      this.activeRequests--;
      throw this.toApiError(error);
    }

    clearTimeout(timeoutId);
    this.activeRequests--;

    if (
      response.status === 401 &&
      this.usesSession(endpoint) &&
      (await this.isSessionRejection(response))
    ) {
      // Safari en iPhone/iPad (sobre todo la app instalada) a veces manda un
      // fetch sin la cookie de sesión aunque la sesión siga viva (bug de
      // WebKit con las cookies SameSite=Lax). Antes de echar a la persona al
      // login se confirma la sesión y, si está bien, se reintenta una vez.
      if (!isRetry && (await this.sessionStillValid())) {
        return this.request<T>(endpoint, options, config, true);
      }
      this.handleUnauthorized();
    }

    try {
      return await this.handleResponse<T>(response);
    } catch (error) {
      throw this.toApiError(error);
    }
  }

  private toApiError(error: unknown): ApiError {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        message: 'Request timeout',
        status: 408,
        code: 'TIMEOUT',
      };
    }

    // Re-throw API errors
    if (typeof error === 'object' && error !== null && 'status' in error) {
      return error as ApiError;
    }

    // Handle network or other errors
    return {
      message: error instanceof Error ? error.message : 'Network error',
      status: 0,
      code: 'NETWORK_ERROR',
      details: error,
    };
  }

  // Un 401 en login significa "credenciales inválidas", no "sesión vencida".
  private usesSession(endpoint: string): boolean {
    return (
      typeof window !== 'undefined' &&
      !endpoint.startsWith('/auth/login') &&
      !endpoint.startsWith('/auth/logout')
    );
  }

  // El 401 del guard de sesión (sin cookie, vencida o cuenta borrada). Otros
  // 401 son del propio endpoint ("PIN incorrecto") y vuelven como error común.
  private async isSessionRejection(response: Response): Promise<boolean> {
    try {
      const body = await response.clone().json();
      return body?.message === 'Unauthorized' || body?.message === 'Sesión inválida';
    } catch {
      return true;
    }
  }

  // Varios pedidos que rebotan juntos comparten una sola verificación.
  private sessionCheck: Promise<boolean> | null = null;

  private sessionStillValid(): Promise<boolean> {
    if (!this.sessionCheck) {
      this.sessionCheck = this.checkSession().finally(() => {
        this.sessionCheck = null;
      });
    }
    return this.sessionCheck;
  }

  // Dos intentos contra /auth/me: si Safari omitió la cookie en uno, el otro
  // la lleva. Sólo un 401 en ambos cuenta como sesión vencida.
  private async checkSession(): Promise<boolean> {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        const res = await fetch(`${this.baseURL}/auth/me`, {
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) return true;
        if (res.status !== 401) return false;
      } catch {
        return false;
      }
    }
    return false;
  }

  // Si el backend devuelve 401 (confirmado) y había una sesión persistida, la
  // cookie está vencida o fue invalidada → limpiamos el user y mandamos al
  // login. Ya estar en `/login` no rebota.
  private handleUnauthorized(): void {
    if (window.location.pathname === '/login') return;

    const persisted = window.localStorage.getItem('mistica-auth-storage');
    if (!persisted) return;

    window.localStorage.removeItem('mistica-auth-storage');
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/login?next=${next}`);
  }

  // HTTP Methods

  async get<T>(endpoint: string, config?: HttpConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' }, config);
  }

  async post<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: HttpConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  async put<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: HttpConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  async patch<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: HttpConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  async delete<T>(
    endpoint: string,
    data?: Record<string, unknown>,
    config?: HttpConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(
      endpoint,
      {
        method: 'DELETE',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  // Utility method for handling paginated requests
  async getPaginated<T>(
    endpoint: string,
    page: number = 1,
    limit: number = 10,
    config?: HttpConfig
  ): Promise<ApiResponse<T>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.get<T>(`${endpoint}?${params.toString()}`, config);
  }

  // Method to check API health
  async healthCheck(): Promise<ApiResponse<string>> {
    return this.get<string>('/');
  }

  // Method to update base URL (useful for environment changes)
  updateBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  // Method to set default timeout
  setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types for use in other services
export type { paths };
