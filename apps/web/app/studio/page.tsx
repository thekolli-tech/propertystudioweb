export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader } from '@property-studio/ui';

const DESTINATIONS = [
  { href: '/studio/properties', label: 'Properties', description: 'Present published listings.' },
  { href: '/studio/projects', label: 'Projects', description: 'Walk through developments.' },
  {
    href: '/studio/market',
    label: 'Market Intelligence',
    description: 'Live market snapshots only.',
  },
  { href: '/studio/media', label: 'Media', description: 'Public media from the CMS.' },
  { href: '/studio/communities', label: 'Communities', description: 'Published communities.' },
  { href: '/studio/compare', label: 'Compare', description: 'Side-by-side intelligence compare.' },
  { href: '/studio/ai', label: 'AI Assistant', description: 'Phase 11 assistant — verified data only.' },
] as const;

export default function StudioHomePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Broadcast Studio"
        description="Full-bleed presentation mode for sales floors and large displays. Empty catalogs stay empty — nothing is invented for the room."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DESTINATIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="ps-broadcast-touch ps-broadcast-chart flex flex-col justify-center rounded-[var(--radius)] border-2 border-border bg-card p-6 transition-colors active:bg-muted"
          >
            <span className="font-display text-[calc(1.125rem*var(--broadcast-scale))] font-[number:var(--broadcast-weight)]">
              {item.label}
            </span>
            <span className="mt-2 text-[calc(0.875rem*var(--broadcast-scale))] text-muted-foreground">
              {item.description}
            </span>
          </Link>
        ))}
      </div>
      <EmptyState
        title="Ready when your catalog is"
        description="Open a destination above. Charts, media, and intelligence panels render only from live APIs."
        className="border-dashed"
      />
    </div>
  );
}
