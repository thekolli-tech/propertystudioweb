'use client';

import * as React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from './ui/button';

export type SidebarNavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  comingSoon?: boolean;
};

export type SidebarNavSection = {
  title?: string;
  items: SidebarNavItem[];
};

export type SidebarNavProps = {
  brand?: React.ReactNode;
  sections: SidebarNavSection[];
  pathname: string;
  linkComponent?: React.ElementType;
  footer?: React.ReactNode;
  className?: string;
  dark?: boolean;
};

export function SidebarNav({
  brand,
  sections,
  pathname,
  linkComponent: LinkComponent = 'a',
  footer,
  className,
  dark = true,
}: SidebarNavProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r transition-[width] duration-200',
        dark
          ? 'border-sidebar-border bg-sidebar text-sidebar-foreground'
          : 'border-border bg-card text-foreground',
        collapsed ? 'w-[72px]' : 'w-60',
        className,
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-inherit px-3">
        <div className={cn('min-w-0', collapsed && 'sr-only')}>{brand}</div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            'shrink-0',
            dark && 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((value) => !value)}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4" aria-label="Sidebar">
        {sections.map((section, index) => (
          <div key={section.title ?? `section-${index}`} className="space-y-1">
            {section.title && !collapsed ? (
              <p
                className={cn(
                  'px-3 pb-1 text-[11px] font-semibold tracking-[0.16em] uppercase',
                  dark ? 'text-sidebar-muted' : 'text-muted-foreground',
                )}
              >
                {section.title}
              </p>
            ) : null}
            {section.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(`${item.href}/`));
              const content = (
                <>
                  {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                  {!collapsed ? (
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="truncate">{item.label}</span>
                      {item.comingSoon ? (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                          Soon
                        </span>
                      ) : null}
                    </span>
                  ) : null}
                </>
              );

              if (item.disabled || item.comingSoon) {
                return (
                  <span
                    key={item.href + item.label}
                    title={item.label}
                    className={cn(
                      'flex cursor-not-allowed items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm opacity-55',
                      dark ? 'text-sidebar-muted' : 'text-muted-foreground',
                    )}
                  >
                    {content}
                  </span>
                );
              }

              return (
                <LinkComponent
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? dark
                        ? 'bg-sidebar-accent text-white'
                        : 'bg-secondary text-foreground'
                      : dark
                        ? 'text-sidebar-muted hover:bg-sidebar-accent hover:text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {content}
                </LinkComponent>
              );
            })}
          </div>
        ))}
      </nav>
      {footer && !collapsed ? <div className="border-t border-inherit p-3">{footer}</div> : null}
    </aside>
  );
}
