'use client';

// <input type="date"> nativo: sin portal, no choca con Radix Dialog.
// value/onChange en 'yyyy-MM-dd' (igual que el viejo DatePicker → swap directo).

import { cn } from '@/lib/utils';

const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

export function DateInput({
  value,
  onChange,
  className,
  disabled,
  disablePast = false,
}: {
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  disablePast?: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <input
      type='date'
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      min={disablePast ? today : undefined}
      className={cn(
        'h-9 w-full rounded-md border px-3 text-sm outline-none',
        fieldCls,
        className,
      )}
    />
  );
}
