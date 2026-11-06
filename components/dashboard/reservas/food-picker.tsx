'use client';

// Buffet libre / Merienda / Sin comida: lo que cocina tiene que preparar. En
// la experiencia es su comida; en una reserva, la cambia sólo para ella.

import { cn } from '@/lib/utils';
import { FOOD_OPTIONS, type FoodKind } from '@/lib/kitchen';

export function FoodPicker({
  value,
  onChange,
  inherited,
  label = 'Comida',
}: Readonly<{
  /** null = la de la experiencia (sólo si se pasa `inherited`). */
  value: FoodKind | null;
  onChange: (value: FoodKind | null) => void;
  /** Comida de la experiencia: suma la opción de volver a ella. */
  inherited?: FoodKind;
  label?: string;
}>) {
  const current = value ?? inherited ?? null;
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-[13px] font-medium text-[#455a54]'>{label}</span>
      <div role='radiogroup' aria-label={label} className='flex flex-wrap gap-1.5'>
        {FOOD_OPTIONS.map((o) => {
          const active = current === o.value;
          const fromExperience = active && value === null && inherited === o.value;
          return (
            <button
              key={o.value}
              type='button'
              role='radio'
              aria-checked={active}
              // Tocar la que ya viene de la experiencia no la "fija": sigue la de ella.
              onClick={() => onChange(inherited === o.value ? null : o.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition',
                active
                  ? 'border-[#455a54] bg-[#455a54] text-white'
                  : 'border-[#e6dbcd] bg-white text-[#455a54] hover:bg-[#fbf5ef]',
              )}
            >
              {o.label}
              {fromExperience && <span className='ml-1 font-normal opacity-80'>· de la experiencia</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
