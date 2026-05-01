// lib/api-config.ts
// Configuration for API endpoints
//
// El backend se sirve vía rewrite de Next (`/api/*` → backend) en
// `next.config.ts`, por lo que en el browser todas las llamadas son same-origin
// y la cookie httpOnly se manda sola con `credentials: 'include'`.

export const API_CONFIG = {
  // Same-origin: vacío en cliente, el rewrite de Next se encarga.
  BASE_URL: '',

  // API version prefix
  API_PREFIX: '/api',

  // Full API URL
  get FULL_URL() {
    return `${this.BASE_URL}${this.API_PREFIX}`;
  },
  
  // Timeout settings
  TIMEOUT: 10000,
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  
  // Endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      REFRESH: '/auth/refresh',
    },
    PRODUCTS: {
      BASE: '/products',
      ALL: '/products/all',
      SEARCH: '/products/search',
      STATS: '/products/stats',
    },
    SALES: {
      BASE: '/sales',
      ALL: '/sales/all',
      DAILY: '/sales/daily',
      STATS: '/sales/stats',
    },
    CLIENTS: {
      BASE: '/clients',
      ALL: '/clients/all',
      PAGINATED: '/clients/paginated',
    },
    EMPLOYEES: {
      BASE: '/employees',
      ALL: '/employees/all',
    },
    PREPAIDS: {
      BASE: '/prepaids',
      ALL: '/prepaids/all',
    },
    EGRESSES: {
      BASE: '/egresses',
      ALL: '/egresses/all',
      STATISTICS: '/egresses/statistics',
    },
  },
} as const;

// Helper function to get full endpoint URL
export function getApiUrl(endpoint: string): string {
  return `${API_CONFIG.FULL_URL}${endpoint}`;
}

// Helper function to check if we're in development
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

// Devuelve el base URL del API:
// - En cliente: '' (mismo origen, lo resuelve el rewrite de Next).
// - En servidor (RSC / Route Handlers): apunta directo al backend para que
//   `fetch` no intente resolver una URL relativa.
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  return process.env.BACKEND_URL || 'http://localhost:3000';
}
