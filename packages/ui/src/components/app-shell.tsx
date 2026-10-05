import * as React from 'react';

import { cn } from '../lib/utils';

export type AppShellProps = {
  header: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function AppShell({ header, sidebar, children, className }: AppShellProps) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      {header}
      <div className="mx-auto flex w-full max-w-7xl gap-0 px-4 sm:px-6 lg:gap-8">
        {sidebar ? (
          <aside className="hidden w-56 shrink-0 border-r border-border lg:block">
            <div className="sticky top-16 py-6 pr-4">{sidebar}</div>
          </aside>
        ) : null}
        <main className="min-w-0 flex-1 py-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
