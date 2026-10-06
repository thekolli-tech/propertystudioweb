import * as React from 'react';

import { cn } from '../lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export type StatCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  unavailable?: boolean;
  icon?: React.ReactNode;
  className?: string;
};

export function StatCard({ label, value, hint, unavailable, icon, className }: StatCardProps) {
  return (
    <Card className={cn('ps-card-elevated rounded-[var(--radius)] border-border/80', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="min-w-0">
          <CardDescription className="text-[11px] font-semibold tracking-[0.14em] uppercase">
            {label}
          </CardDescription>
          <CardTitle className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {unavailable ? (
              <span className="text-sm font-medium text-muted-foreground">Not available yet</span>
            ) : (
              value
            )}
          </CardTitle>
        </div>
        {icon ? (
          <div className="rounded-[var(--radius)] bg-secondary p-2 text-secondary-foreground">
            {icon}
          </div>
        ) : null}
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {hint}
        </CardContent>
      ) : null}
    </Card>
  );
}
