'use client';

import { cn } from '@/lib/utils';

const DEFAULT_SWATCHES = [
  '#9d684e', '#8a5a45', '#c08968', '#e0a38d',
  '#455a54', '#6b8074', '#4e4247', '#7a6d72',
  '#d4a574', '#b8860b', '#a0522d', '#5d4037',
];

interface ColorSwatchPickerProps {
  value: string;
  onChange: (hex: string) => void;
  swatches?: string[];
}

export function ColorSwatchPicker({ value, onChange, swatches = DEFAULT_SWATCHES }: ColorSwatchPickerProps) {
  const normalized = value.trim().toLowerCase();
  return (
    <div className='grid grid-cols-6 gap-1.5'>
      {swatches.map((hex) => {
        const selected = normalized === hex.toLowerCase();
        return (
          <button
            key={hex}
            type='button'
            aria-label={hex}
            aria-pressed={selected}
            onClick={() => onChange(hex)}
            className={cn(
              'h-7 w-7 rounded-md border transition-all',
              selected
                ? 'border-[#455a54] ring-2 ring-[#455a54]/40 scale-105'
                : 'border-[#9d684e]/20 hover:scale-105'
            )}
            style={{ backgroundColor: hex }}
          />
        );
      })}
    </div>
  );
}
