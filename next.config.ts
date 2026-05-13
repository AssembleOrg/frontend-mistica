import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  compress: true,

  // El proxy al backend antes era una rewrite (`/api/:path* → BACKEND_URL/api/:path*`),
  // pero Next 16.1.x con path-to-regexp v8 explota cuando el destino tiene
  // un `:NNNN` (port) literal — lo interpreta como param name inválido.
  // Las URLs internas de Railway tienen puerto explícito
  // (`http://service.railway.internal:3000/api`), así que el rewrite queda
  // inutilizable.
  //
  // Reemplazado por un Route Handler en `app/api/[...path]/route.ts` que
  // proxea programáticamente con fetch:
  //   - Cero parsing de URL por path-to-regexp.
  //   - Forwardea Set-Cookie correctamente (múltiples cookies).
  //   - Funciona con private domain Railway server-side.
  //
  // URL del backend se lee de `process.env.BACKEND_URL` (server-only).
};

export default nextConfig;
