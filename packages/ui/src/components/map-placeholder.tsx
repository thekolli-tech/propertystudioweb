import * as React from 'react';
import { MapPinned } from 'lucide-react';

import { cn } from '../lib/utils';

export type MapPlaceholderProps = {
  label?: string;
  className?: string;
};

/** Visual map foundation — no fabricated pins or third-party map tiles in Phase 6. */
export function MapPlaceholder({
  label = 'Map foundation',
  className,
}: MapPlaceholderProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-[linear-gradient(135deg,hsl(var(--muted))_0%,hsl(var(--secondary))_50%,hsl(var(--accent))_100%)] text-muted-foreground',
        className,
      )}
      role="img"
      aria-label={label}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />
      <MapPinned className="relative h-8 w-8 opacity-70" aria-hidden />
      <p className="relative mt-2 text-sm font-medium">{label}</p>
      <p className="relative mt-1 max-w-xs text-center text-xs">
        Interactive maps ship when a mapping provider is integrated. Location text remains the source of truth.
      </p>
    </div>
  );
}
