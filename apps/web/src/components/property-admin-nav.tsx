'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Building2,
  ClipboardList,
  FileText,
  FolderKanban,
  Home,
  ImageIcon,
  LayoutDashboard,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { SidebarNav } from '@property-studio/ui';

const SECTIONS = [
  {
    title: 'Workspace',
    items: [
      {
        href: '/app/property-admin',
        label: 'Dashboard',
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        href: '/app/property-admin/projects',
        label: 'Assigned projects',
        icon: <FolderKanban className="h-4 w-4" />,
      },
      {
        href: '/app/property-admin/properties',
        label: 'Assigned properties',
        icon: <Home className="h-4 w-4" />,
      },
      {
        href: '/app/property-admin/inventory',
        label: 'Inventory',
        icon: <ClipboardList className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Operations',
    items: [
      {
        href: '/app/property-admin/updates',
        label: 'Construction updates',
        icon: <Building2 className="h-4 w-4" />,
      },
      {
        href: '/app/property-admin/media',
        label: 'Media',
        icon: <ImageIcon className="h-4 w-4" />,
      },
      {
        href: '/app/property-admin/documents',
        label: 'Documents',
        icon: <FileText className="h-4 w-4" />,
      },
      {
        href: '/app/property-admin/community',
        label: 'Community',
        icon: <UsersRound className="h-4 w-4" />,
      },
      {
        href: '/app/property-admin/notifications',
        label: 'Notifications',
        icon: <Bell className="h-4 w-4" />,
      },
      {
        href: '/app/property-admin/profile',
        label: 'Profile',
        icon: <UserRound className="h-4 w-4" />,
      },
    ],
  },
];

export function PropertyAdminNav() {
  const pathname = usePathname();
  return (
    <SidebarNav
      dark={false}
      pathname={pathname}
      linkComponent={Link}
      brand={
        <Link href="/app/property-admin" className="font-display text-lg font-semibold text-foreground">
          Property <span className="text-premium">Admin</span>
        </Link>
      }
      sections={SECTIONS}
    />
  );
}
