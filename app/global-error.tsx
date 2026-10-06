'use client';

// Último recurso: si falla la app entera (p. ej. un navegador viejo que no
// entiende algo del código), un mensaje con salida en vez de pantalla trabada.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang='es'>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 24,
          textAlign: 'center',
          background: '#efcbb9',
          color: '#455a54',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <p style={{ fontSize: 18, margin: 0 }}>No se pudo abrir el panel.</p>
        <p style={{ fontSize: 12, margin: 0, opacity: 0.7, maxWidth: 360, wordBreak: 'break-word' }}>
          {error.message || 'Error inesperado'}
          {error.digest ? ` · ${error.digest}` : ''}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type='button'
            onClick={() => reset()}
            style={{ padding: '8px 16px', borderRadius: 8, border: 0, background: '#455a54', color: '#fff' }}
          >
            Reintentar
          </button>
          <a
            href='/login'
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #455a54', color: '#455a54', textDecoration: 'none' }}
          >
            Ir al login
          </a>
        </div>
      </body>
    </html>
  );
}
