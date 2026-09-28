// Service worker mínimo: hace la web instalable (PWA). No cachea nada, así
// el panel siempre trabaja con datos frescos del backend.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough: algunos navegadores exigen un handler de fetch para ofrecer
// instalar la app.
self.addEventListener('fetch', () => {});
