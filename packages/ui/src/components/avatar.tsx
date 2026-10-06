import * as React from 'react';

import { cn } from '../lib/utils';

export type AvatarProps = {
  name: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function Avatar({ name, className, size = 'md' }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground',
        size === 'sm' && 'h-8 w-8 text-xs',
        size === 'md' && 'h-10 w-10 text-sm',
        size === 'lg' && 'h-12 w-12 text-base',
        className,
      )}
      aria-hidden
    >
      {initials || 'PS'}
    </span>
  );
}
