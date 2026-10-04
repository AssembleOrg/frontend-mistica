'use client';

import { useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { PopoverPortal } from '@/components/ui/popover-portal';
import { cn } from '@/lib/utils';
import { catalogFieldCls, norm } from './catalog-combobox';

/** Paleta del taller, agrupada como la organizan ellos. */
export const COLOR_GROUPS: string[][] = [
  ['Rosa Clarito', 'Marrón Clarito', 'Rojo Clarito', 'Agua Clarito', 'Oscuro'],
  ['Marrón', 'Naranja', 'Verde Lima', 'Violeta', 'Marrón Oscuro'],
  ['Agua', 'Turquesa/Celeste', 'Azul', 'Rojo', 'Amarillo', 'Verde Pasto', 'Verde Menta'],
  ['Mostaza', 'Arena', 'Negro', 'Gris', 'Rosa', 'Lila'],
];

const SEP = ', ';

const parse = (value: string) =>
  value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * "Colores utilizados": selección múltiple de la paleta. Se guarda como texto
 * ("Azul, Rosa"); colores viejos cargados a mano se conservan.
 */
export function ColorsSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parse(value);
  const isSelected = (c: string) => selected.some((s) => norm(s) === norm(c));

  function toggle(c: string) {
    const next = isSelected(c)
      ? selected.filter((s) => norm(s) !== norm(c))
      : [...selected, c];
    onChange(next.join(SEP));
  }

  return (
    <div className={cn('relative', className)}>
      <button
        ref={anchorRef}
        type='button'
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex min-h-9 w-full items-center gap-2 rounded-md border px-3 py-1.5 pr-8 text-left text-sm',
          catalogFieldCls,
        )}
      >
        {selected.length ? (
          <span className='line-clamp-2'>{selected.join(SEP)}</span>
        ) : (
          <span className='text-muted-foreground'>Elegí los colores…</span>
        )}
        <ChevronDown className='pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a6e6f]' />
      </button>
      <PopoverPortal
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        className='max-h-72 overflow-y-auto rounded-lg border border-[#e6dbcd] bg-white py-1 shadow-lg'
      >
        {COLOR_GROUPS.map((group, gi) => (
          <div key={gi} className={cn(gi > 0 && 'mt-1 border-t border-[#e6dbcd] pt-1')}>
            {group.map((c) => (
              <button
                key={c}
                type='button'
                onClick={() => toggle(c)}
                className='flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm text-[#3d3338] hover:bg-[#fbf5ef]'
              >
                <span>{c}</span>
                {isSelected(c) && <Check className='h-4 w-4 text-[#455a54]' />}
              </button>
            ))}
          </div>
        ))}
      </PopoverPortal>
    </div>
  );
}
