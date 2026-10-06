import * as React from 'react';
import { Building2 } from 'lucide-react';

import { cn } from '../lib/utils';

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius)] border border-border bg-card px-6 py-14 text-center ps-card-elevated sm:py-16',
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {icon ?? <Building2 className="h-5 w-5" aria-hidden />}
      </div>
      <h2 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
