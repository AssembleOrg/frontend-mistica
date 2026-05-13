/**
 * Base URL para llamadas al backend.
 *
 * - Browser: usa `/api` (relativo) → entra al Route Handler en
 *   `app/api/[...path]/route.ts`, que forwardea al backend (privado o
 *   público según env). Esto permite usar private domain de Railway sin
 *   que el browser sufra (no puede resolver `*.railway.internal`).
 *
 * - Server-side (SSR / RSC / route handlers): usa `BACKEND_URL` (env
 *   server-only que sí puede ser private domain) → cae a localhost.
 *
 * El backend monta sus controllers bajo `/api`. Si `BACKEND_URL` ya viene
 * con `/api` al final, no lo duplicamos.
 */
export function getApiBaseUrl(): string {
  if (typeof globalThis.window === 'undefined') {
    const raw = process.env.BACKEND_URL || 'http://localhost:3000';
    const trimmed = raw.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return '/api';
}
