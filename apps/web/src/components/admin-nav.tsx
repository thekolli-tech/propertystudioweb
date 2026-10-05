'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@property-studio/ui';

const ADMIN_NAV: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/organizations', label: 'Organizations' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/moderation', label: 'Moderation' },
  { href: '/admin/audit', label: 'Audit' },
  { href: '/admin/catalog', label: 'Catalog' },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="space-y-1">
      {ADMIN_NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-md px-3 py-2 text-sm transition-colors',
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
