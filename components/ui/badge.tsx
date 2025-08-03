import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = {
  default: 'bg-[var(--color-gris-claro)]/50 text-[var(--color-ciruela-oscuro)]',
  secondary: 'bg-[var(--color-rosa-claro)]/30 text-[var(--color-ciruela-oscuro)]',
  outline: 'border border-[var(--color-gris-claro)] text-[var(--color-ciruela-oscuro)]',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge, badgeVariants };