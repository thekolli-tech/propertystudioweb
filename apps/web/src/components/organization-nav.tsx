'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@property-studio/ui';

export type OrganizationNavProps = {
  orgPublicId: string;
  organizationType: 'DEVELOPER' | 'AGENCY';
};

const DEVELOPER_ITEMS: Array<{ segment: string; label: string }> = [
  { segment: '', label: 'Overview' },
  { segment: 'projects', label: 'Projects' },
  { segment: 'properties', label: 'Properties' },
  { segment: 'community', label: 'Community' },
  { segment: 'leads', label: 'Leads' },
  { segment: 'team', label: 'Team' },
  { segment: 'documents', label: 'Documents' },
  { segment: 'billing', label: 'Billing' },
  { segment: 'settings', label: 'Settings' },
];

const AGENCY_ITEMS: Array<{ segment: string; label: string }> = [
  { segment: '', label: 'Overview' },
  { segment: 'properties', label: 'Properties' },
  { segment: 'requirements', label: 'Requirements' },
  { segment: 'leads', label: 'Leads' },
  { segment: 'team', label: 'Team' },
  { segment: 'verification', label: 'Verification' },
  { segment: 'documents', label: 'Documents' },
  { segment: 'settings', label: 'Settings' },
];

export function OrganizationNav({ orgPublicId, organizationType }: OrganizationNavProps) {
  const pathname = usePathname();
  const base = `/app/org/${orgPublicId}`;
  const items = organizationType === 'DEVELOPER' ? DEVELOPER_ITEMS : AGENCY_ITEMS;

  return (
    <nav aria-label="Organization" className="flex gap-1 lg:block lg:space-y-1">
      {items.map((item) => {
        const href = item.segment ? `${base}/${item.segment}` : base;
        const active = item.segment === '' ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-accent font-medium text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
