'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@property-studio/ui';

const ITEMS = [
  { segment: '', label: 'Overview' },
  { segment: 'wallet', label: 'Wallet' },
  { segment: 'plans', label: 'Plans' },
];

export function BillingSubnav({ orgPublicId }: { orgPublicId: string }) {
  const pathname = usePathname();
  const base = `/app/org/${orgPublicId}/billing`;

  return (
    <nav aria-label="Billing" className="flex flex-wrap gap-1 border-b border-border pb-2">
      {ITEMS.map((item) => {
        const href = item.segment ? `${base}/${item.segment}` : base;
        const active = item.segment === '' ? pathname === base : pathname.startsWith(href);
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
