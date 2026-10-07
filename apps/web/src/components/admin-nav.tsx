'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Clapperboard,
  ClipboardList,
  CreditCard,
  FileText,
  Flag,
  Images,
  Inbox,
  LayoutDashboard,
  LineChart,
  Radio,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  BarChart3,
  ExternalLink,
  Library,
  PenLine,
  Plug,
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
    title: 'Marketplace',
    items: [
      {
        href: '/admin/requirements',
        label: 'Requirements',
        icon: <ClipboardList className="h-4 w-4" />,
      },
      { href: '/admin/leads', label: 'Leads', icon: <Inbox className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Media CMS',
    items: [
      { href: '/admin/media', label: 'Media', icon: <Images className="h-4 w-4" /> },
      { href: '/admin/content', label: 'Content', icon: <PenLine className="h-4 w-4" /> },
      { href: '/admin/collections', label: 'Collections', icon: <Library className="h-4 w-4" /> },
      { href: '/admin/creators', label: 'Creators', icon: <Clapperboard className="h-4 w-4" /> },
      {
        href: '/admin/external-media',
        label: 'External providers',
        icon: <ExternalLink className="h-4 w-4" />,
      },
      { href: '/admin/broadcast', label: 'Broadcast', icon: <Radio className="h-4 w-4" /> },
      {
        href: '/admin/media/analytics',
        label: 'Analytics',
        icon: <BarChart3 className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Trust',
    items: [
      {
        href: '/admin/verification',
        label: 'Verification',
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      { href: '/admin/reviews', label: 'Reviews', icon: <Star className="h-4 w-4" /> },
      { href: '/admin/reports', label: 'Reports', icon: <Flag className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      {
        href: '/admin/intelligence',
        label: 'Intelligence',
        icon: <LineChart className="h-4 w-4" />,
      },
      { href: '/admin/ai', label: 'AI', icon: <Sparkles className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/admin/moderation', label: 'Moderation', icon: <Shield className="h-4 w-4" /> },
      { href: '/admin/audit', label: 'Audit logs', icon: <ScrollText className="h-4 w-4" /> },
      { href: '/admin/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
      {
        href: '/admin/subscriptions',
        label: 'Subscriptions',
        icon: <CreditCard className="h-4 w-4" />,
      },
      { href: '/admin/payments', label: 'Payments', icon: <CreditCard className="h-4 w-4" /> },
      { href: '/admin/invoices', label: 'Invoices', icon: <FileText className="h-4 w-4" /> },
      { href: '/admin/wallets', label: 'Wallets', icon: <CreditCard className="h-4 w-4" /> },
      {
        href: '/admin/integrations',
        label: 'Integrations',
        icon: <Plug className="h-4 w-4" />,
      },
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
