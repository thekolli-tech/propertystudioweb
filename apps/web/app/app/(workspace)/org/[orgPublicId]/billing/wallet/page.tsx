export const dynamic = 'force-dynamic';

import { DashboardSection, EmptyState, PageHeader, StatCard } from '@property-studio/ui';
import { Wallet } from 'lucide-react';

import { BillingSubnav } from '@/components/billing/billing-subnav';
import { WalletTopUpForm } from '@/components/billing/wallet-topup-form';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Wallet' };

function formatInr(minor: string): string {
  const value = Number(minor) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export default async function OrganizationWalletPage({
  params,
}: {
  params: Promise<{ orgPublicId: string }>;
}) {
  const { orgPublicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let wallet: Awaited<ReturnType<typeof client.getWallet>> | null = null;
  let ledger: Awaited<ReturnType<typeof client.listWalletLedger>> | null = null;
  let unavailable = false;

  try {
    wallet = await client.getWallet(orgPublicId);
    ledger = await client.listWalletLedger({ organizationPublicId: orgPublicId, limit: 50 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        description="Organization credit balance and immutable ledger entries."
      />
      <BillingSubnav orgPublicId={orgPublicId} />

      {unavailable || !wallet ? (
        <EmptyState
          title="Wallet unavailable"
          description="The wallet API could not be loaded for this organization."
        />
      ) : (
        <>
          <StatCard
            label="Current balance"
            value={formatInr(wallet.balanceMinor)}
            hint={`${wallet.currency} · ${wallet.publicId}`}
            icon={<Wallet className="h-4 w-4" />}
          />

          <DashboardSection
            title="Sandbox top-up"
            description="Creates a sandbox financial transaction and credits the wallet. Live Razorpay capture is not enabled."
          >
            <WalletTopUpForm orgPublicId={orgPublicId} />
          </DashboardSection>

          <DashboardSection title="Ledger" description="Credits, debits, refunds, and adjustments.">
            {!ledger || ledger.entries.length === 0 ? (
              <EmptyState
                title="No ledger entries"
                description="Wallet mutations will create immutable ledger rows here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">ID</th>
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Amount</th>
                      <th className="py-2 pr-3 font-medium">Balance after</th>
                      <th className="py-2 pr-3 font-medium">Description</th>
                      <th className="py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.entries.map((entry) => (
                      <tr key={entry.publicId} className="border-b border-border/70">
                        <td className="py-2 pr-3 font-mono text-xs">{entry.publicId}</td>
                        <td className="py-2 pr-3">{entry.entryType}</td>
                        <td className="py-2 pr-3">{formatInr(entry.amountMinor)}</td>
                        <td className="py-2 pr-3">{formatInr(entry.balanceAfterMinor)}</td>
                        <td className="py-2 pr-3">{entry.description ?? '—'}</td>
                        <td className="py-2">
                          {new Date(entry.createdAt).toLocaleString('en-IN')}
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
