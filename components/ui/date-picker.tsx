'use client';

import * as React from 'react';
import { CalendarIcon, X } from 'lucide-react';
import { format, parse } from 'date-fns';
import { es } from 'date-fns/locale';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';

export interface DatePickerProps {
  /** Valor en formato plano 'yyyy-MM-dd' (sin hora, sin TZ). */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Muestra una X para limpiar la fecha. */
  clearable?: boolean;
  disabled?: boolean;
}

// Parseamos 'yyyy-MM-dd' como fecha LOCAL a medianoche (sin new Date(iso) para
// no correr el día por interpretación UTC). Igual criterio que fmtYmd.
function parseYmd(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, 'yyyy-MM-dd', new Date());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Elegí una fecha',
  className,
  clearable = false,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = parseYmd(value);

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div className={cn('relative', className)} ref={ref}>
      <Button
        type='button'
        variant='outline'
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full justify-start border-[#e6dbcd] bg-[#fbf5ef] text-left font-normal text-[#3d3338] hover:bg-[#f3e9df] hover:text-[#3d3338]',
          !selected && 'text-[#7a6e6f]',
        )}
      >
        <CalendarIcon className='mr-2 h-4 w-4 text-[#9d684e]' />
        <span className='flex-1 truncate'>
          {selected ? format(selected, 'dd/MM/yyyy', { locale: es }) : placeholder}
        </span>
        {clearable && selected && (
          <span
            role='button'
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className='ml-2 rounded p-0.5 text-[#7a6e6f] hover:bg-[#9d684e]/20'
          >
            <X className='h-3.5 w-3.5' />
          </span>
        )}
      </Button>

      {open && (
        <div className='absolute left-0 top-full z-50 mt-1 w-auto rounded-md border border-[#e6dbcd] bg-white shadow-lg'>
          <Calendar
            mode='single'
            locale={es}
            defaultMonth={selected ?? new Date()}
            selected={selected}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, 'yyyy-MM-dd'));
                setOpen(false);
              }
            }}
            className='p-2'
          />
        </div>
      )}
    </div>
  );
}
