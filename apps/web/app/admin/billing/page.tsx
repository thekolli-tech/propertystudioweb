import Link from 'next/link';
import { PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Billing control' };

const LINKS = [
  {
    href: '/admin/subscriptions',
    label: 'Subscriptions',
    description: 'Plans and org subscriptions',
  },
  {
    href: '/admin/payments',
    label: 'Payments',
    description: 'Captured and failed payment records',
  },
  { href: '/admin/invoices', label: 'Invoices', description: 'Issued invoice ledger' },
  { href: '/admin/wallets', label: 'Wallets', description: 'Organization wallet balances' },
  {
    href: '/admin/overview?period=DAYS_30',
    label: 'Money analytics',
    description: 'Period aggregates from the control center',
  },
];

export default function AdminBillingHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing control"
        description="Hub for Phase 9 money operations. Exact bigint INR arithmetic remains authoritative in NestJS."
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-[var(--radius)] border border-border bg-card p-4 transition hover:opacity-90"
            >
              <p className="font-medium">{link.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
