'use client';

// Restricciones alimentarias de una reserva.
//
// Se muestran en TODAS las vistas de la reserva (listado, detalle, anotados,
// agenda de mesas) a propósito: el equipo tiene que enterarse cuando prepara el
// día, no cuando la persona llega y avisa que es celíaca.

import { UtensilsCrossed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

/** Etiquetas rápidas al cargar una reserva a mano (las mismas que usa el bot). */
export const DIETARY_OPTIONS = ['sin TACC', 'vegano', 'vegetariano', 'sin lactosa'];

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

/**
 * Restricciones del grupo al cargar o editar una reserva: chips rápidos + el
 * detalle (alergias, etc.). Las que trajo el bot y no están entre las rápidas
 * también aparecen, para poder sacarlas.
 */
export function DietaryPicker({
  tags,
  onTagsChange,
  notes,
  onNotesChange,
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}) {
  const options = [...new Set([...DIETARY_OPTIONS, ...tags])];
  return (
    <div className='flex flex-col gap-2'>
      <div className='flex flex-wrap gap-1.5'>
        {options.map((t) => {
          const on = tags.includes(t);
          return (
            <button
              key={t}
              type='button'
              aria-pressed={on}
              onClick={() =>
                onTagsChange(on ? tags.filter((x) => x !== t) : [...tags, t])
              }
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                on
                  ? 'border-[#9d684e] bg-[#9d684e] text-white'
                  : 'border-[#e0c9a8] bg-[#f4ead9] text-[#9d684e] hover:bg-[#efe0c8]',
              )}
            >
              {on ? '✓ ' : ''}
              {t}
            </button>
          );
        })}
      </div>
      <Input
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder='Alergias u otra restricción (detalle)'
        aria-label='Detalle de restricciones'
        maxLength={500}
        className='border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30'
      />
    </div>
  );
}
