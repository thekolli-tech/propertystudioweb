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
    <Card className={cn('ps-card-elevated border-border/80', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardDescription className="text-xs font-medium tracking-[0.12em] uppercase">
            {label}
          </CardDescription>
          <CardTitle className="mt-2 text-3xl font-semibold tracking-tight">
            {unavailable ? (
              <span className="text-base font-medium text-muted-foreground">Not available yet</span>
            ) : (
              value
            )}
          </CardTitle>
        </div>
        {icon ? (
          <div className="rounded-lg bg-secondary p-2 text-secondary-foreground">{icon}</div>
        ) : null}
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0 text-sm text-muted-foreground">{hint}</CardContent>
      ) : null}
    </Card>
  );
}
