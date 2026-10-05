import * as React from 'react';

import { cn } from '../lib/utils';

export type LoadingStateProps = {
  label?: string;
  className?: string;
};

export function LoadingState({ label = 'Loading…', className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[12rem] flex-col items-center justify-center gap-3 text-muted-foreground',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
        aria-hidden="true"
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
