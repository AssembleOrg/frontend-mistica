import type { NextConfig } from 'next';

// Backend URL para el rewrite de /api/* → backend.
// En dev defaultea a localhost:3000 (el puerto donde corre Nest).
const RAW_BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Saca barra final accidental y valida el esquema antes de armar el rewrite.
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/+$/, '');
if (!/^https?:\/\//.test(BACKEND_URL)) {
  throw new Error(
    `BACKEND_URL inválida: "${RAW_BACKEND_URL}". Debe empezar con http:// o https://`
  );
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
