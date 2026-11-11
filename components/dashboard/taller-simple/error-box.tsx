'use client';

/** Aviso fijo cuando no se pudo cargar: uno solo, en pantalla, sin toasts. */
export function ErrorBox() {
  return (
    <p className='mb-4 rounded-2xl border-2 border-[#c0392b]/40 bg-[#f6e2e2] px-4 py-3 text-lg font-bold text-[#8a2a20]'>
      No se pudo conectar. Avisale a la administración.
    </p>
  );
}
