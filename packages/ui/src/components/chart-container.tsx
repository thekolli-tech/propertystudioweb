import * as React from 'react';

import { cn } from '../lib/utils';
import { EmptyState } from './empty-state';

export type ChartContainerProps = {
  title?: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
  unavailable?: boolean;
};

/** Chart shell — never invent series data. Use empty/unavailable until metrics APIs exist. */
export function ChartContainer({
  title = 'Analytics',
  description,
  className,
  children,
  unavailable = false,
}: ChartContainerProps) {
  return (
    <section
      className={cn('rounded-xl border border-border bg-card p-5 ps-card-elevated', className)}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {unavailable || !children ? (
        <EmptyState
          title="Not available yet"
          description="Charts render only when backed by live metrics APIs."
        />
      ) : (
        children
      )}
    </section>
  );
}
