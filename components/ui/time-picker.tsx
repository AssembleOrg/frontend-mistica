'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface TimePickerProps {
  /** Valor 'HH:mm' (24hs). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Hora de inicio/fin de la grilla y el paso (en minutos). */
  fromHour?: number;
  toHour?: number;
  stepMinutes?: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function TimePicker({
  value,
  onChange,
  placeholder = 'Hora',
  className,
  fromHour = 7,
  toHour = 22,
  stepMinutes = 30,
}: TimePickerProps) {
  const options = React.useMemo(() => {
    const grid: string[] = [];
    for (let h = fromHour; h <= toHour; h++) {
      for (let m = 0; m < 60; m += stepMinutes) grid.push(`${pad(h)}:${pad(m)}`);
    }
    // Si el valor actual cae fuera de la grilla (ej. un turno viejo 16:45), lo
    // incluimos igual para no perderlo.
    if (value && !grid.includes(value)) grid.push(value);
    return Array.from(new Set(grid)).sort();
  }, [value, fromHour, toHour, stepMinutes]);

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          'border-[#e6dbcd] bg-[#fbf5ef] text-[#3d3338] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30 data-[placeholder]:text-[#7a6e6f]',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className='max-h-64'>
        {options.map((t) => (
          <SelectItem key={t} value={t}>
            {t}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
