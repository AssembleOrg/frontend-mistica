'use client';

// Panel flotante portaleado al <body>. Resuelve el bug de dropdowns/calendarios
// clippeados dentro de un modal con overflow-y-auto: al portalear fuera del
// DialogContent ya no los recorta. Posición `fixed` anclada al rect del trigger,
// recalculada en scroll/resize. Click-afuera cuenta el panel como "adentro".
//
// No usa @radix-ui/react-popover (no instalado) — solo createPortal + rect.
// ponytail: alineación bottom-start/-end sin flip vertical; si un panel quedara
// cortado contra el borde inferior, agregar la medición de viewport acá.

import * as React from 'react';
import { createPortal } from 'react-dom';

export function PopoverPortal({
  open,
  onClose,
  anchorRef,
  align = 'start',
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  /** Alinea el borde del panel con el mismo borde del trigger. */
  align?: 'start' | 'end';
  className?: string;
  children: React.ReactNode;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number; width: number } | null>(null);

  const place = React.useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: align === 'end' ? r.right : r.left, width: r.width });
  }, [anchorRef, align]);

  React.useLayoutEffect(() => {
    if (!open) return;
    place();
    window.addEventListener('scroll', place, true); // capture: atrapa scroll de contenedores internos
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return; // click en el trigger: lo maneja el trigger
      if (panelRef.current?.contains(t)) return; // click dentro del panel portaleado
      onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose, anchorRef]);

  if (!open || !pos || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      // Marca para que el DialogContent NO cierre cuando el click/foco cae en
      // este panel portaleado (vive en <body>, fuera del árbol del Dialog, así
      // que Radix lo tomaría como "afuera"). Ver dialog.tsx (onInteractOutside).
      data-popover-portal=''
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: align === 'end' ? 'translateX(-100%)' : undefined,
        minWidth: pos.width,
        zIndex: 60, // por encima del DialogContent (z-50)
      }}
      className={className}
    >
      {children}
    </div>,
    document.body,
  );
}
