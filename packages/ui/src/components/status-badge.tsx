import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        success: 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]',
        warning: 'bg-[hsl(var(--warning)/0.14)] text-[hsl(var(--warning))]',
        danger: 'bg-[hsl(var(--destructive)/0.12)] text-[hsl(var(--destructive))]',
        info: 'bg-[hsl(var(--info)/0.12)] text-[hsl(var(--info))]',
        premium: 'bg-[hsl(var(--premium)/0.16)] text-[hsl(var(--premium-foreground))]',
      },
    },
    defaultVariants: {
      tone: 'neutral',
    },
  },
);

export type StatusBadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof statusBadgeVariants> & {
    showDot?: boolean;
  };

export function StatusBadge({
  className,
  tone,
  showDot = true,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)} {...props}>
      {showDot ? (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            tone === 'success' && 'bg-[hsl(var(--success))]',
            tone === 'warning' && 'bg-[hsl(var(--warning))]',
            tone === 'danger' && 'bg-[hsl(var(--destructive))]',
            tone === 'info' && 'bg-[hsl(var(--info))]',
            tone === 'premium' && 'bg-[hsl(var(--premium))]',
            (!tone || tone === 'neutral') && 'bg-muted-foreground',
          )}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}

export function availabilityTone(
  status: string,
): NonNullable<VariantProps<typeof statusBadgeVariants>['tone']> {
  switch (status) {
    case 'AVAILABLE':
      return 'success';
    case 'UNDER_OFFER':
      return 'warning';
    case 'SOLD':
      return 'info';
    case 'UNAVAILABLE':
      return 'danger';
    default:
      return 'neutral';
  }
}
