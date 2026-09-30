import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mística Auténtica',
    // Nombre bajo el ícono y el que se busca en el cajón de apps.
    short_name: 'Mística',
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
    // Fondo sólido de marca: con el logo transparente, Android lo recortaba y
    // rellenaba de color y el ícono quedaba irreconocible. Los maskable dejan
    // el badge dentro de la zona segura para que el recorte no lo corte.
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
