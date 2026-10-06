export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Wallets' };

export default async function AdminWalletsPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let wallets: Awaited<ReturnType<typeof client.adminListWallets>> | null = null;
  let unavailable = false;

  try {
    wallets = await client.adminListWallets({ limit: 50 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Wallets" description="Organization wallet balances." />
      {unavailable ? (
        <EmptyState
          title="Wallets unavailable"
          description="Admin wallet APIs could not be loaded."
        />
      ) : !wallets || wallets.wallets.length === 0 ? (
        <EmptyState
          title="No wallets yet"
          description="Organization wallets are created on first billing access."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">ID</th>
                <th className="py-2 pr-3 font-medium">Organization</th>
                <th className="py-2 pr-3 font-medium">Balance</th>
                <th className="py-2 font-medium">Currency</th>
              </tr>
            </thead>
            <tbody>
              {wallets.wallets.map((wallet) => (
                <tr key={wallet.publicId} className="border-b border-border/70">
                  <td className="py-2 pr-3 font-mono text-xs">{wallet.publicId}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{wallet.organizationPublicId}</td>
                  <td className="py-2 pr-3">{wallet.balanceMinor}</td>
                  <td className="py-2">{wallet.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
