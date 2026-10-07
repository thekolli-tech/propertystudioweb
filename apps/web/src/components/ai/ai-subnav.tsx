'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@property-studio/ui';

const ITEMS: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/app/ai', label: 'Overview', exact: true },
  { href: '/app/ai/chat', label: 'Copilot' },
  { href: '/app/ai/assistant', label: 'Assistant' },
  { href: '/app/ai/search', label: 'Search' },
  { href: '/app/ai/match', label: 'Match' },
  { href: '/app/ai/valuation', label: 'Valuation' },
  { href: '/app/ai/compare', label: 'Compare' },
];

export function AiSubnav() {
  const pathname = usePathname();

  return (
    <nav aria-label="AI tools" className="flex flex-wrap gap-1">
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
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
