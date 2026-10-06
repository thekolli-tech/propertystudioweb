export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { DashboardSection, EmptyState, PageHeader, StatCard } from '@property-studio/ui';
import { CreditCard, Receipt, Wallet } from 'lucide-react';

import { BillingSubnav } from '@/components/billing/billing-subnav';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Billing' };

function formatInr(minor: string): string {
  const value = Number(minor) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export default async function OrganizationBillingPage({
  params,
}: {
  params: Promise<{ orgPublicId: string }>;
}) {
  const { orgPublicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let overview: Awaited<ReturnType<typeof client.getBillingOverview>> | null = null;
  let payments: Awaited<ReturnType<typeof client.listPayments>> | null = null;
  let invoices: Awaited<ReturnType<typeof client.listInvoices>> | null = null;
  let unavailable = false;

  try {
    overview = await client.getBillingOverview({ organizationPublicId: orgPublicId });
    payments = await client.listPayments({ organizationPublicId: orgPublicId, limit: 10 });
    invoices = await client.listInvoices({ organizationPublicId: orgPublicId, limit: 10 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Subscription, wallet credits, transactions, and invoices for this organization."
      />
      <BillingSubnav orgPublicId={orgPublicId} />

      {unavailable || !overview ? (
        <EmptyState
          title="Billing unavailable"
          description="The billing overview API could not be loaded for this organization."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Wallet balance"
              value={formatInr(overview.walletBalanceMinor)}
              hint={`${overview.walletCurrency} minor units on ledger.`}
              icon={<Wallet className="h-4 w-4" />}
            />
            <StatCard
              label="Open invoices"
              value={overview.openInvoices}
              hint="Issued or overdue invoices."
              icon={<Receipt className="h-4 w-4" />}
            />
            <StatCard
              label="Pending payments"
              value={overview.pendingPayments}
              hint="Financial transactions awaiting capture."
              icon={<CreditCard className="h-4 w-4" />}
            />
            <StatCard
              label="Lead purchases"
              value={overview.completedLeadPurchases}
              hint="Completed marketplace lead purchases."
              icon={<CreditCard className="h-4 w-4" />}
            />
          </div>

          <DashboardSection
            title="Current plan"
            description="Active organization subscription and entitlements."
          >
            {!overview.subscription ? (
              <EmptyState
                title="No active subscription"
                description="Choose a plan to unlock marketplace entitlements and included credits."
                action={
                  <Link
                    href={`/app/org/${orgPublicId}/billing/plans`}
                    className="text-sm font-medium text-primary"
                  >
                    View plans
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">{overview.subscription.planName}</span>{' '}
                  <span className="text-muted-foreground">({overview.subscription.planCode})</span>
                </p>
                <p className="text-muted-foreground">
                  Status {overview.subscription.status} · renews{' '}
                  {new Date(overview.subscription.currentPeriodEnd).toLocaleDateString('en-IN')}
                </p>
                <p className="text-muted-foreground">
                  Entitlements:{' '}
                  {overview.entitlements.length > 0 ? overview.entitlements.join(', ') : 'None'}
                </p>
              </div>
            )}
          </DashboardSection>

          <DashboardSection title="Recent transactions" description="Latest financial activity.">
            {!payments || payments.transactions.length === 0 ? (
              <EmptyState
                title="No transactions yet"
                description="Wallet top-ups, subscriptions, and lead purchases will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">ID</th>
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Amount</th>
                      <th className="py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.transactions.map((tx) => (
                      <tr key={tx.publicId} className="border-b border-border/70">
                        <td className="py-2 pr-3 font-mono text-xs">{tx.publicId}</td>
                        <td className="py-2 pr-3">{tx.type}</td>
                        <td className="py-2 pr-3">{tx.status}</td>
                        <td className="py-2 pr-3">{formatInr(tx.amountMinor)}</td>
                        <td className="py-2">{new Date(tx.createdAt).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardSection>

          <DashboardSection title="Invoices" description="Issued billing documents.">
            {!invoices || invoices.invoices.length === 0 ? (
              <EmptyState
                title="No invoices yet"
                description="Invoices are created when subscription and payment events are issued."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Number</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Total</th>
                      <th className="py-2 font-medium">Issued</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.invoices.map((invoice) => (
                      <tr key={invoice.publicId} className="border-b border-border/70">
                        <td className="py-2 pr-3 font-mono text-xs">{invoice.invoiceNumber}</td>
                        <td className="py-2 pr-3">{invoice.status}</td>
                        <td className="py-2 pr-3">{formatInr(invoice.totalMinor)}</td>
                        <td className="py-2">
                          {invoice.issuedAt
                            ? new Date(invoice.issuedAt).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardSection>
        </>
      )}
    </div>
  );
}
