import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mistica Autentica',
    short_name: 'Mistica',
    description: 'Administración POS/ERP',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#d9dadb',
    theme_color: '#455a54',
    icons: [
      { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
