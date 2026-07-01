'use client';

// Reveal-on-scroll: fade + subida sutil cuando el bloque entra en viewport,
// una sola vez. Usa IntersectionObserver (sin librerías, performance-free).
// La animación real vive en las clases .reveal / .is-visible de globals.css.

import { useEffect, useRef, useState, type ElementType } from 'react';

export function Reveal({
  children,
  as: Tag = 'div',
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  /** Etiqueta a renderizar (div por defecto). */
  as?: ElementType;
  /** Retraso en ms para escalonar (stagger). */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
