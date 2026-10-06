'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@property-studio/ui';

const CRM_ITEMS = [
  { segment: '', label: 'Overview' },
  { segment: 'leads', label: 'Leads' },
  { segment: 'contacts', label: 'Contacts' },
  { segment: 'follow-ups', label: 'Follow-ups' },
  { segment: 'site-visits', label: 'Site Visits' },
  { segment: 'deals', label: 'Deals' },
] as const;

export function CrmSubnav({ orgPublicId }: { orgPublicId: string }) {
  const pathname = usePathname();
  const base = `/app/org/${orgPublicId}/crm`;

  return (
    <nav aria-label="CRM sections" className="flex flex-wrap gap-1 border-b border-border pb-3">
      {CRM_ITEMS.map((item) => {
        const href = item.segment ? `${base}/${item.segment}` : base;
        const active =
          item.segment === ''
            ? pathname === base || pathname === `${base}/`
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              active
                ? 'bg-secondary font-medium text-foreground'
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
