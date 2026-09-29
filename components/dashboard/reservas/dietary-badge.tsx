'use client';

// Restricciones alimentarias de una reserva.
//
// Se muestran en TODAS las vistas de la reserva (listado, detalle, anotados,
// agenda de mesas) a propósito: el equipo tiene que enterarse cuando prepara el
// día, no cuando la persona llega y avisa que es celíaca.

import { UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Las que conviene que salten a la vista (alergias sobre todo). */
const CRITICAS = ['alergia', 'alergias', 'celiaco', 'celíaco', 'celiaca', 'celíaca'];

function esCritica(tag: string): boolean {
  const t = tag.toLowerCase();
  return CRITICAS.some((c) => t.includes(c));
}

export function DietaryTags({
  tags,
  notes,
  compact = false,
}: {
  tags?: string[];
  notes?: string;
  /** Sin la etiqueta "Restricciones", para renglones apretados. */
  compact?: boolean;
}) {
  const list = tags ?? [];
  if (!list.length && !notes) return null;

  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      {!compact && (
        <span className='inline-flex items-center gap-1.5 text-[13px] font-medium text-[#9d684e]'>
          <UtensilsCrossed className='h-3.5 w-3.5' />
          Restricciones
        </span>
      )}
      {compact && <UtensilsCrossed className='h-3.5 w-3.5 shrink-0 text-[#9d684e]' />}
      {list.map((t) => (
        <span
          key={t}
          className={cn(
            'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
            esCritica(t)
              ? 'border-[#d98b8b] bg-[#f6e2e2] text-[#a33]'
              : 'border-[#e0c9a8] bg-[#f4ead9] text-[#9d684e]',
          )}
        >
          {t}
        </span>
      ))}
      {notes && (
        <span
          className='text-[12px] italic text-[#7a6e6f]'
          title='Detalle que dejó el cliente'
        >
          {notes}
        </span>
      )}
    </div>
  );
}
