import * as React from 'react';

import { cn } from '../lib/utils';

export type DashboardShellProps = {
  sidebar: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** Full-bleed authenticated shell with fixed sidebar column (admin / property-admin). */
export function DashboardShell({ sidebar, header, children, className }: DashboardShellProps) {
  return (
    <div className={cn('flex min-h-screen bg-background', className)}>
      <div className="sticky top-0 hidden h-screen shrink-0 lg:block">{sidebar}</div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          {header}
        </div>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
