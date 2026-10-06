export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin leads' };

export default async function AdminLeadsPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let leads: Awaited<ReturnType<typeof client.listAdminLeads>>['leads'] = [];
  let unavailable = false;

  try {
    const response = await client.listAdminLeads({ limit: 50 });
    leads = response.leads;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Marketplace lead foundation. Buyer contact details are not revealed in Phase 7."
      />

      {unavailable ? (
        <EmptyState
          title="Not available yet"
          description="Admin leads API is unavailable for this session."
        />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads yet."
          description="Leads appear when eligible organizations engage marketplace requirements."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Requirement</th>
                <th className="px-4 py-3 font-medium">Recipient org</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((item) => (
                <tr key={item.publicId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{item.publicId}</td>
                  <td className="px-4 py-3">{item.requirementPublicId}</td>
                  <td className="px-4 py-3">{item.recipientOrganizationPublicId}</td>
                  <td className="px-4 py-3">{item.matchScore}/100</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="info">{item.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">{item.source}</td>
                  <td className="px-4 py-3">
                    {new Date(item.createdAt).toLocaleDateString('en-IN')}
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
