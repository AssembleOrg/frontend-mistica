import type { NextConfig } from 'next';

// Backend URL para el rewrite de /api/* → backend.
// En dev defaultea a localhost:3000 (el puerto donde corre Nest).
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

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
