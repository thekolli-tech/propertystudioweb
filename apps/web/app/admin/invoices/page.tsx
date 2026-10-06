export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Invoices' };

export default async function AdminInvoicesPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let invoices: Awaited<ReturnType<typeof client.adminListInvoices>> | null = null;
  let unavailable = false;

  try {
    invoices = await client.adminListInvoices({ limit: 50 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Platform invoices across organizations." />
      {unavailable ? (
        <EmptyState
          title="Invoices unavailable"
          description="Admin invoice APIs could not be loaded."
        />
      ) : !invoices || invoices.invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Issued invoices will appear here when billing events occur."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Number</th>
                <th className="py-2 pr-3 font-medium">Organization</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Total</th>
                <th className="py-2 font-medium">Issued</th>
              </tr>
            </thead>
            <tbody>
              {invoices.invoices.map((invoice) => (
                <tr key={invoice.publicId} className="border-b border-border/70">
                  <td className="py-2 pr-3 font-mono text-xs">{invoice.invoiceNumber}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{invoice.organizationPublicId}</td>
                  <td className="py-2 pr-3">{invoice.status}</td>
                  <td className="py-2 pr-3">
                    {invoice.totalMinor} {invoice.currency}
                  </td>
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
    </div>
  );
}
