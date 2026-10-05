'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { OrganizationSummary, UserSummary } from '@property-studio/contracts';
import { Button, cn } from '@property-studio/ui';
import { Bell, Menu, X } from 'lucide-react';
import { useState } from 'react';

import { OrganizationSwitcher } from './organization-switcher';
import { UserMenu } from './user-menu';

const APP_NAV: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/app', label: 'Home', exact: true },
  { href: '/app/requirements', label: 'Requirements' },
  { href: '/app/saved', label: 'Saved' },
  { href: '/app/inbox', label: 'Inbox' },
  { href: '/app/me', label: 'Profile' },
];

export type AppHeaderProps = {
  user: UserSummary;
  organizations: OrganizationSummary[];
};

export function AppHeader({ user, organizations }: AppHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isPropertyAdminOnly =
    user.platformRoles.includes('PROPERTY_ADMIN') &&
    !user.platformRoles.includes('SUPER_ADMIN') &&
    !user.platformRoles.includes('ADMIN');
  const showSuperAdmin =
    user.platformRoles.includes('SUPER_ADMIN') ||
    user.platformRoles.includes('ADMIN') ||
    user.platformRoles.includes('MODERATOR') ||
    user.platformRoles.includes('CONTENT_EDITOR');
  const consoleHref = isPropertyAdminOnly ? '/app/property-admin' : '/admin';
  const consoleLabel = isPropertyAdminOnly ? 'Property Admin' : 'Admin';
  const showConsole = isPropertyAdminOnly || showSuperAdmin;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/app"
          className="font-display text-lg font-semibold tracking-tight text-foreground"
        >
          Property Studio
        </Link>

        <nav className="ml-4 hidden items-center gap-4 lg:flex" aria-label="Application">
          {APP_NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'text-sm transition-colors hover:text-foreground',
                  active ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
          {showConsole ? (
            <Link
              href={consoleHref}
              className={cn(
                'text-sm transition-colors hover:text-foreground',
                pathname.startsWith(consoleHref)
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {consoleLabel}
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <OrganizationSwitcher
              organizations={organizations}
              activeOrganizationPublicId={user.activeOrganizationPublicId}
            />
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>
          <div className="hidden sm:block">
            <UserMenu user={user} />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-background px-4 py-4 lg:hidden">
          <div className="mb-4 sm:hidden">
            <OrganizationSwitcher
              organizations={organizations}
              activeOrganizationPublicId={user.activeOrganizationPublicId}
            />
          </div>
          <nav className="flex flex-col gap-3" aria-label="Mobile application">
            {APP_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-sm"
              >
                {item.label}
              </Link>
            ))}
            {showConsole ? (
              <Link href={consoleHref} onClick={() => setOpen(false)} className="text-sm">
                {consoleLabel}
              </Link>
            ) : null}
          </nav>
          <div className="mt-4 sm:hidden">
            <UserMenu user={user} />
          </div>
        </div>
      ) : null}
    </header>
  );
}
