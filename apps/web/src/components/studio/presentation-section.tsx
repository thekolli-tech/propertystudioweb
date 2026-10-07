import type { ReactNode } from 'react';
import type { BroadcastPresentationSection } from '@property-studio/contracts';
import { EmptyState, cn } from '@property-studio/ui';

import { CoverageBadge } from '@/components/intelligence/coverage-badge';

export type PresentationSectionProps = {
  section: BroadcastPresentationSection;
  className?: string;
  children?: ReactNode;
};

/**
 * Broadcast presentation block. Unavailable / insufficient data is always explicit —
 * never filled with placeholder charts or fabricated metrics.
 */
export function PresentationSection({ section, className, children }: PresentationSectionProps) {
  const coverage =
    section.available === false
      ? ('UNAVAILABLE' as const)
      : section.data == null
        ? ('INSUFFICIENT_DATA' as const)
        : ('READY' as const);

  return (
    <section
      className={cn(
        'ps-broadcast-chart space-y-4 rounded-[var(--radius)] border-2 border-border bg-card p-5 sm:p-6',
        className,
      )}
      aria-labelledby={`presentation-${section.id}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2
          id={`presentation-${section.id}`}
          className="font-display text-[calc(1.125rem*var(--broadcast-scale))] font-[number:var(--broadcast-weight)] tracking-tight"
        >
          {section.title}
        </h2>
        <CoverageBadge state={coverage} />
      </div>

      {!section.available ? (
        <EmptyState
          title="Unavailable"
          description={
            section.unavailableReason ??
            'This section is not available for broadcast presentation yet.'
          }
          className="border-0 bg-transparent py-8 shadow-none"
        />
      ) : section.data == null && !children ? (
        <EmptyState
          title="Insufficient data"
          description={
            section.unavailableReason ??
            'Not enough verified data to present this section. Nothing is invented for display.'
          }
          className="border-0 bg-transparent py-8 shadow-none"
        />
      ) : (
        (children ?? null)
      )}
    </section>
  );
}
