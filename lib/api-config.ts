// lib/api-config.ts
// Configuration for API endpoints

export const API_CONFIG = {
  // Base URL for the API
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  
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

// Helper function to get the correct base URL based on environment
export function getBaseUrl(): string {
  // Always use the configured API URL, never the frontend origin
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}
