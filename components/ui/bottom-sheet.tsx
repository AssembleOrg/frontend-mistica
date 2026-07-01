'use client';

// Bottom-sheet nativo basado en <dialog>: focus-trap y Esc gratis del browser.
// En desktop se centra como panel; en mobile sube desde abajo como hoja.
// Solo presentación — no contiene lógica de negocio.

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // El backdrop cierra; el click en el contenido no burbujea al dialog.
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className='sheet m-0 w-full max-w-full bg-transparent p-0 backdrop:bg-ciruela-oscuro/50 sm:mx-auto sm:my-auto sm:max-w-3xl lg:max-w-4xl'
    >
      <div className='sheet-scroll flex max-h-[92dvh] flex-col overflow-y-auto bg-arena sm:rounded-[4px]'>
        {/* Grab-handle (afordancia de gesto) */}
        <div className='flex shrink-0 justify-center pt-3 sm:hidden'>
          <span className='h-1 w-10 rounded-full bg-linea' />
        </div>

        <div className='flex shrink-0 items-center justify-between px-6 pb-4 pt-4'>
          {title ? (
            <h2 className='font-playfair text-2xl font-medium text-ciruela-oscuro'>
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type='button'
            onClick={onClose}
            aria-label='Cerrar'
            className='press -mr-2 flex h-10 w-10 items-center justify-center text-piedra hover:text-ciruela-oscuro'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='safe-b px-6 pb-6'>{children}</div>
      </div>
    </dialog>
  );
}
