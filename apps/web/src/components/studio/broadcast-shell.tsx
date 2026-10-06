'use client';

import type { ReactNode } from 'react';
import { BroadcastModeProvider, cn } from '@property-studio/ui';

import { BroadcastNav } from './broadcast-nav';

export type BroadcastShellProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Full-bleed Broadcast Studio shell. Always enables BroadcastModeProvider —
 * this is not a second theme system; it only scales the existing design tokens.
 */
export function BroadcastShell({ children, className }: BroadcastShellProps) {
  return (
    <BroadcastModeProvider forceEnabled>
      <div
        className={cn(
          'flex min-h-screen flex-col bg-background text-foreground',
          'text-[calc(1rem*var(--broadcast-scale))] font-[number:var(--broadcast-weight)]',
          className,
        )}
      >
        <BroadcastNav />
        <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-12">{children}</main>
      </div>
    </BroadcastModeProvider>
  );
}
