'use client';

// Si una pantalla del panel falla, se muestra esto en vez de quedar en blanco
// o trabada. El detalle sirve para que nos manden una captura.

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center'>
      <p className='font-tan-nimbus text-xl text-[#455a54]'>Algo falló al mostrar esta pantalla.</p>
      <p className='max-w-sm break-words text-xs text-[#7a6e6f]'>
        {error.message || 'Error inesperado'}
        {error.digest ? ` · ${error.digest}` : ''}
      </p>
      <div className='flex gap-2'>
        <button
          type='button'
          onClick={() => reset()}
          className='rounded-lg bg-[#455a54] px-4 py-2 text-sm font-medium text-white'
        >
          Reintentar
        </button>
        <button
          type='button'
          onClick={() => window.location.reload()}
          className='rounded-lg border border-[#455a54]/30 px-4 py-2 text-sm font-medium text-[#455a54]'
        >
          Recargar
        </button>
      </div>
    </div>
  );
}
