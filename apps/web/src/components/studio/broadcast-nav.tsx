'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  FolderKanban,
  Home,
  Images,
  LineChart,
  Sparkles,
  UsersRound,
  GitCompareArrows,
} from 'lucide-react';
import { cn } from '@property-studio/ui';

const ITEMS: Array<{
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}> = [
  { href: '/studio', label: 'Home', icon: Home, exact: true },
  { href: '/studio/properties', label: 'Properties', icon: Building2 },
  { href: '/studio/projects', label: 'Projects', icon: FolderKanban },
  { href: '/studio/market', label: 'Market Intelligence', icon: LineChart },
  { href: '/studio/media', label: 'Media', icon: Images },
  { href: '/studio/communities', label: 'Communities', icon: UsersRound },
  { href: '/studio/compare', label: 'Compare', icon: GitCompareArrows },
  { href: '/studio/ai', label: 'AI Copilot', icon: Sparkles },
];

export function BroadcastNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-card/95 backdrop-blur-sm">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <Link
          href="/studio"
          className="ps-broadcast-touch inline-flex items-center font-display text-[calc(1.25rem*var(--broadcast-scale))] font-[number:var(--broadcast-weight)] tracking-tight text-foreground"
        >
          Property <span className="ml-1 text-[hsl(var(--premium))]">Studio</span>
          <span className="ml-3 text-[calc(0.7rem*var(--broadcast-scale))] font-normal tracking-[0.14em] text-muted-foreground uppercase">
            Broadcast
          </span>
        </Link>

        <nav
          aria-label="Broadcast Studio"
          className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'ps-broadcast-touch inline-flex shrink-0 items-center gap-2 rounded-[var(--radius)] border-2 px-4 text-[calc(0.875rem*var(--broadcast-scale))] transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card text-foreground active:bg-muted',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
