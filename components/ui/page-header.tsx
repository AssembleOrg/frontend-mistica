'use client';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Compact page header. Dense, premium-feel:
 *  - title: 20-24px Tan Nimbus
 *  - subtitle: 12-13px Winter Solid muted
 *  - meta: optional inline element next to title (e.g., a count badge)
 *  - actions: right-aligned controls
 */
export function PageHeader({
  title,
  subtitle,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4',
        className
      )}
    >
      <div className='space-y-0.5 min-w-0'>
        <div className='flex items-baseline gap-2 flex-wrap'>
          <h1 className='text-xl sm:text-2xl font-tan-nimbus text-[#455a54] leading-tight'>
            {title}
          </h1>
          {meta && <span className='flex-shrink-0'>{meta}</span>}
        </div>
        {subtitle && (
          <p className='text-xs sm:text-[13px] text-[#455a54]/60 font-winter-solid'>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className='flex items-center gap-2 flex-shrink-0'>{actions}</div>
      )}
    </div>
  );
}
