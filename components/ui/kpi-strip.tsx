'use client';

import { cn } from '@/lib/utils';

export interface KpiStripItem {
  label: string;
  value: string | number;
  hint?: string;
  /** CSS color (var or hex). Defaults to verde-profundo. */
  accent?: string;
}

interface KpiStripProps {
  items: KpiStripItem[];
  className?: string;
}

/**
 * Single bordered card with internal divisions. Mobile: 2 cols. Desktop: as many
 * cols as items (max 4 inline). Mirrors the Finanzas/Sales-stats KPI strip:
 * one container, no per-item card => no overflow on small screens.
 *
 * For 1 item: no grid, just a single block.
 * For 3 items: 2 cols on mobile (last spans full), 3 cols on desktop.
 * For 4 items: 2x2 mobile, 1x4 desktop.
 */
export function KpiStrip({ items, className }: KpiStripProps) {
  const count = items.length;
  const colsClass =
    count === 1
      ? ''
      : count === 2
        ? 'grid grid-cols-2'
        : count === 3
          ? 'grid grid-cols-2 sm:grid-cols-3'
          : 'grid grid-cols-2 lg:grid-cols-4';

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden',
        count > 1 && colsClass,
        count > 1 && 'divide-x divide-y sm:divide-y-0',
        className
      )}
      style={{
        borderColor: 'var(--color-gris-claro)',
        background: 'var(--color-blanco)',
      }}
    >
      {items.map((item, i) => {
        const accent = item.accent ?? 'var(--color-verde-profundo)';
        const isOddLast = count === 3 && i === 2;
        return (
          <div
            key={`${item.label}-${i}`}
            className={cn(
              'p-4 flex flex-col gap-1 min-w-0',
              isOddLast && 'col-span-2 sm:col-span-1'
            )}
          >
            <span
              className='text-xs font-winter-solid uppercase tracking-wide truncate'
              style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.7 }}
            >
              {item.label}
            </span>
            <span
              className='text-xl font-bold font-tan-nimbus tabular-nums truncate'
              style={{ color: accent }}
            >
              {item.value}
            </span>
            {item.hint && (
              <span
                className='text-xs font-winter-solid truncate'
                style={{ color: 'var(--color-ciruela-oscuro)', opacity: 0.6 }}
              >
                {item.hint}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
