'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
  Bell,
  CreditCard,
  FileText,
  FolderKanban,
  Home,
  Images,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Settings,
  ShieldCheck,
  Star,
  Users,
  UsersRound,
  ClipboardList,
  Inbox,
  Plug,
} from 'lucide-react';
import { cn } from '@property-studio/ui';

export type OrganizationNavProps = {
  orgPublicId: string;
  organizationType: 'DEVELOPER' | 'AGENCY';
};

type NavItem = {
  segment: string;
  label: string;
  icon: ReactNode;
  comingSoon?: boolean;
};

const SHARED_TRUST_ITEMS: NavItem[] = [
  { segment: 'verification', label: 'Verification', icon: <ShieldCheck className="h-4 w-4" /> },
  { segment: 'reviews', label: 'Reviews', icon: <Star className="h-4 w-4" /> },
  { segment: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { segment: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
];

const SHARED_INTELLIGENCE_ITEM: NavItem = {
  segment: 'intelligence',
  label: 'Intelligence',
  icon: <LineChart className="h-4 w-4" />,
};

const DEVELOPER_ITEMS: NavItem[] = [
  { segment: '', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { segment: 'projects', label: 'Projects', icon: <FolderKanban className="h-4 w-4" /> },
  { segment: 'properties', label: 'Properties', icon: <Home className="h-4 w-4" /> },
  { segment: 'community', label: 'Community', icon: <UsersRound className="h-4 w-4" /> },
  { segment: 'leads', label: 'Leads', icon: <Inbox className="h-4 w-4" /> },
  { segment: 'crm', label: 'CRM', icon: <ClipboardList className="h-4 w-4" /> },
  { segment: 'team', label: 'Team', icon: <Users className="h-4 w-4" /> },
  ...SHARED_TRUST_ITEMS,
  SHARED_INTELLIGENCE_ITEM,
  { segment: 'media', label: 'Media', icon: <Images className="h-4 w-4" /> },
  { segment: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { segment: 'billing', label: 'Billing', icon: <CreditCard className="h-4 w-4" /> },
  { segment: 'integrations', label: 'Integrations', icon: <Plug className="h-4 w-4" /> },
  { segment: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
];

const AGENCY_ITEMS: NavItem[] = [
  { segment: '', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
  { segment: 'properties', label: 'Properties', icon: <Home className="h-4 w-4" /> },
  { segment: 'requirements', label: 'Requirements', icon: <ClipboardList className="h-4 w-4" /> },
  { segment: 'leads', label: 'Leads', icon: <Inbox className="h-4 w-4" /> },
  { segment: 'crm', label: 'CRM', icon: <ClipboardList className="h-4 w-4" /> },
  { segment: 'team', label: 'Team', icon: <Users className="h-4 w-4" /> },
  ...SHARED_TRUST_ITEMS,
  SHARED_INTELLIGENCE_ITEM,
  { segment: 'media', label: 'Media', icon: <Images className="h-4 w-4" /> },
  { segment: 'documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { segment: 'billing', label: 'Billing', icon: <CreditCard className="h-4 w-4" /> },
  { segment: 'integrations', label: 'Integrations', icon: <Plug className="h-4 w-4" /> },
  { segment: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
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
        if (item.comingSoon) {
          return (
            <span
              key={href}
              className="flex cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-muted-foreground opacity-60"
              title="Coming soon"
            >
              {item.icon}
              <span>{item.label}</span>
              <span className="ml-auto hidden text-[10px] uppercase tracking-wide lg:inline">
                Soon
              </span>
            </span>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-secondary font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
