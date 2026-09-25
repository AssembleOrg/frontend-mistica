'use client';

import { cn } from '@/lib/utils';

export const fieldCls =
  'border-[#e6dbcd] bg-[#fbf5ef] text-[#455a54] focus-visible:border-[#9d684e] focus-visible:ring-[#9d684e]/30';

/** Tarjeta de sección con título y ayuda, como en el resto de Reservas. */
export function Section({
  title,
  help,
  action,
  children,
  className,
}: {
  title: string;
  help?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-4 rounded-2xl border border-[#e6dbcd] bg-white p-5', className)}>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div className='flex flex-col gap-0.5'>
          <h3 className='font-tan-nimbus text-lg font-bold text-[#455a54]'>{title}</h3>
          {help && <p className='text-sm text-[#7a6e6f]'>{help}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className='flex flex-col gap-1.5'>
      <label className='text-[13px] font-medium text-[#455a54]'>{label}</label>
      {children}
      {help && <p className='text-xs text-[#7a6e6f]'>{help}</p>}
    </div>
  );
}
