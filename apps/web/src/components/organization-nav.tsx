'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@property-studio/ui';

const DEFAULT_ITEMS: Array<{ segment: string; label: string }> = [
  { segment: '', label: 'Overview' },
  { segment: 'properties', label: 'Properties' },
  { segment: 'projects', label: 'Projects' },
  { segment: 'leads', label: 'Leads' },
  { segment: 'crm', label: 'CRM' },
  { segment: 'team', label: 'Team' },
  { segment: 'billing', label: 'Billing' },
  { segment: 'documents', label: 'Documents' },
  { segment: 'settings', label: 'Settings' },
];

export type OrganizationNavProps = {
  orgPublicId: string;
};

export function OrganizationNav({ orgPublicId }: OrganizationNavProps) {
  const pathname = usePathname();
  const base = `/app/org/${orgPublicId}`;

  return (
    <nav aria-label="Organization" className="flex gap-1 lg:block lg:space-y-1">
      {DEFAULT_ITEMS.map((item) => {
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
