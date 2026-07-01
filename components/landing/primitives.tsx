'use client';

// Primitivas visuales de la superficie pública (landing + reservas).
// Solo presentación: no cambian ninguna lógica de datos ni de flujo.

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ReservationStatus } from '@/services/reservations.public.service';

/**
 * Micro-etiqueta de sección — reemplaza el "eyebrow" con líneas.
 * Mono, mayúsculas, tracking amplio. SIN líneas, asteriscos ni emojis.
 */
export function SectionLabel({
  children,
  className = '',
  tone = 'terracota',
}: {
  children: string;
  className?: string;
  tone?: 'terracota' | 'durazno' | 'arena';
}) {
  const color =
    tone === 'durazno'
      ? 'text-durazno'
      : tone === 'arena'
        ? 'text-arena/70'
        : 'text-terracota';
  return (
    <span
      className={`font-mono text-[11px] uppercase tracking-[0.18em] ${color} ${className}`}
    >
      {children}
    </span>
  );
}

export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente de pago',
  CONFIRMED: 'Confirmada',
  EXPIRED: 'Vencida',
  CANCELLED: 'Cancelada',
  NEEDS_REVIEW: 'En revisión',
};

/**
 * Estado de reserva como texto tipográfico — reemplaza la pill redondeada.
 * Un punto de color + label; sin fondo, sin borde de "badge".
 */
export function StatusText({
  status,
  className = '',
}: {
  status: ReservationStatus | string;
  className?: string;
}) {
  const dot =
    status === 'CONFIRMED'
      ? 'bg-verde-profundo'
      : status === 'EXPIRED' || status === 'CANCELLED'
        ? 'bg-terracota'
        : status === 'NEEDS_REVIEW'
          ? 'bg-naranja-medio'
          : 'bg-piedra';
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {RESERVATION_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function prettyCode(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

/**
 * Código de reserva de 6 caracteres, tipográfico y copiable.
 * `variant='light'` para fondos claros, `'dark'` para superficies oscuras.
 */
export function ReservationCode({
  code,
  variant = 'light',
}: {
  code: string;
  variant?: 'light' | 'dark';
}) {
  const [copied, setCopied] = useState(false);
  const dark = variant === 'dark';

  return (
    <div className='flex flex-col items-center gap-3'>
      <SectionLabel tone={dark ? 'durazno' : 'terracota'}>
        Tu código de reserva
      </SectionLabel>
      <div
        className={`flex w-full items-center justify-center border py-5 ${
          dark ? 'border-arena/20 bg-arena/5' : 'border-linea bg-arena-2'
        }`}
      >
        <span
          className={`font-mono text-4xl font-semibold tracking-[0.2em] ${
            dark ? 'text-arena' : 'text-ciruela-oscuro'
          }`}
        >
          {prettyCode(code)}
        </span>
      </div>
      <button
        type='button'
        onClick={() => {
          navigator.clipboard?.writeText(code);
          setCopied(true);
        }}
        className={`press flex items-center gap-2 px-5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] ${
          dark ? 'bg-arena text-terracota' : 'bg-terracota text-arena'
        }`}
      >
        {copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
        {copied ? 'Copiado' : 'Copiar código'}
      </button>
    </div>
  );
}
