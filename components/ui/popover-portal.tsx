'use client';

// Panel flotante portaleado al <body>. Resuelve el bug de dropdowns/calendarios
// clippeados dentro de un modal con overflow-y-auto: al portalear fuera del
// DialogContent ya no los recorta. Posición `fixed` anclada al rect del trigger,
// recalculada en scroll/resize. Click-afuera cuenta el panel como "adentro".
//
// No usa @radix-ui/react-popover (no instalado) — solo createPortal + rect.
// Si no entra abajo del trigger, flipea arriba; si tampoco entra arriba, se
// pega al borde inferior. Horizontalmente se clampa al viewport.

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
    // Primer cálculo sin panel montado (h=w=0): ubica abajo; el segundo pase
    // (layout effect sobre `pos`) mide el panel real y corrige antes del paint.
    const h = panelRef.current?.offsetHeight ?? 0;
    const w = panelRef.current?.offsetWidth ?? 0;
    const GAP = 4;
    const EDGE = 8;
    let top = r.bottom + GAP;
    if (top + h > window.innerHeight - EDGE) top = r.top - GAP - h; // flip arriba
    if (top < EDGE) top = Math.max(EDGE, window.innerHeight - EDGE - h); // no entra: pegar abajo
    let left = align === 'end' ? r.right - w : r.left;
    left = Math.max(EDGE, Math.min(left, window.innerWidth - EDGE - w));
    setPos((prev) =>
      prev && prev.top === top && prev.left === left && prev.width === r.width
        ? prev
        : { top, left, width: r.width },
    );
  }, [anchorRef, align]);

  // Segundo pase: con el panel ya en el DOM se puede medir y flipear/clampar.
  // El bail-out por igualdad en setPos evita el loop.
  React.useLayoutEffect(() => {
    if (open && pos) place();
  }, [open, pos, place]);

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
        minWidth: pos.width,
        maxWidth: `calc(100vw - 16px)`,
        zIndex: 60, // por encima del DialogContent (z-50)
        // Radix Dialog modal pone pointer-events:none en <body>; este panel vive
        // ahí y lo heredaría: el click atraviesa el calendario, cae en el overlay
        // y cierra el modal. Forzamos auto para que el click quede en el panel.
        pointerEvents: 'auto',
      }}
      className={className}
    >
      {children}
    </div>,
    document.body,
  );
}
