'use client';

// Alias de compatibilidad: ningún flujo usa <input type="date"> nativo.
// DatePicker presenta siempre DD/MM/YYYY y el calendario en español.
import { DatePicker } from '@/components/ui/date-picker';

export function DateInput({ value, onChange, className, disabled, disablePast = false }: {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  disablePast?: boolean;
}) {
  return <DatePicker value={value} onChange={onChange} className={className} disabled={disabled} disablePast={disablePast} clearable />;
}
