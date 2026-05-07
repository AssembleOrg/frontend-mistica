'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'compact';
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center py-6 px-4',
          className
        )}
      >
        {Icon && <Icon className='w-5 h-5 text-[#9d684e]/55 mb-2' />}
        <p className='text-sm font-winter-solid text-[#455a54]/85'>{title}</p>
        {description && (
          <p className='text-xs text-[#455a54]/55 mt-1 max-w-xs'>{description}</p>
        )}
        {action && <div className='mt-3'>{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-10 px-6 rounded-lg bg-[#efcbb9]/15 border border-dashed border-[#9d684e]/20',
        className
      )}
    >
      {Icon && (
        <div className='w-12 h-12 rounded-full bg-[#9d684e]/10 flex items-center justify-center mb-3'>
          <Icon className='w-6 h-6 text-[#9d684e]' />
        </div>
      )}
      <h3 className='text-base font-tan-nimbus text-[#455a54] mb-1'>{title}</h3>
      {description && (
        <p className='text-sm font-winter-solid text-[#455a54]/65 max-w-sm'>
          {description}
        </p>
      )}
      {action && <div className='mt-5'>{action}</div>}
    </div>
  );
}
