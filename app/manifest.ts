import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mistica Autentica',
    short_name: 'Mistica',
    description: 'Administración POS/ERP',
    id: '/dashboard',
    // La app instalada abre directo en el panel (sin sesión, el proxy manda al inicio).
    start_url: '/dashboard',
    scope: '/',
    lang: 'es-AR',
    display: 'standalone',
    orientation: 'any',
    background_color: '#d9dadb',
    theme_color: '#455a54',
    icons: [
      { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
