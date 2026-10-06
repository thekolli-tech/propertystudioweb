'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  ScrollText,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { SidebarNav } from '@property-studio/ui';

const SECTIONS = [
  {
    title: 'Platform',
    items: [
      { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { href: '/admin/users', label: 'Users', icon: <Users className="h-4 w-4" /> },
      {
        href: '/admin/organizations',
        label: 'Organizations',
        icon: <Building2 className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { href: '/admin/catalog', label: 'Catalog', icon: <ClipboardList className="h-4 w-4" /> },
      { href: '/admin/projects', label: 'Projects' },
      { href: '/admin/properties', label: 'Properties' },
      { href: '/admin/communities', label: 'Communities' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/admin/moderation', label: 'Moderation', icon: <Shield className="h-4 w-4" /> },
      { href: '/admin/audit', label: 'Audit logs', icon: <ScrollText className="h-4 w-4" /> },
      { href: '/admin/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
      { href: '/admin/payments', label: 'Payments', icon: <CreditCard className="h-4 w-4" /> },
      { href: '/admin/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <SidebarNav
      dark
      pathname={pathname}
      linkComponent={Link}
      brand={
        <Link href="/admin" className="font-display text-lg font-semibold text-white">
          Property <span className="text-[hsl(var(--premium))]">Studio</span>
        </Link>
      }
      sections={SECTIONS}
    />
  );
}
