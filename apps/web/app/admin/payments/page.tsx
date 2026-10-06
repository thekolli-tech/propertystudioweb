export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Payments' };

export default async function AdminPaymentsPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let payments: Awaited<ReturnType<typeof client.adminListPayments>> | null = null;
  let unavailable = false;

  try {
    payments = await client.adminListPayments({ limit: 50 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Platform financial transactions." />
      {unavailable ? (
        <EmptyState
          title="Payments unavailable"
          description="Admin payment APIs could not be loaded."
        />
      ) : !payments || payments.transactions.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Financial transactions will appear here. No fabricated revenue metrics are shown."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">ID</th>
                <th className="py-2 pr-3 font-medium">Organization</th>
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
                  <td className="py-2 pr-3 font-mono text-xs">{tx.organizationPublicId}</td>
                  <td className="py-2 pr-3">{tx.type}</td>
                  <td className="py-2 pr-3">{tx.status}</td>
                  <td className="py-2 pr-3">
                    {tx.amountMinor} {tx.currency}
                  </td>
                  <td className="py-2">{new Date(tx.createdAt).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
