import * as React from 'react';

import { cn } from '../lib/utils';

export type FilterBarProps = {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
};

export function FilterBar({ children, className, actions }: FilterBarProps) {
  return (
    <div
      className={cn(
        'ps-card-elevated flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card p-3 sm:p-4',
        className,
      )}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">{children}</div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export type FilterFieldProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export function FilterField({ label, children, className }: FilterFieldProps) {
  return (
    <label
      className={cn('flex flex-col gap-1.5 text-[11px] font-semibold text-muted-foreground', className)}
    >
      <span className="tracking-[0.12em] uppercase">{label}</span>
      {children}
    </label>
  );
}
