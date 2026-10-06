export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, PriceDisplay, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin requirements' };

export default async function AdminRequirementsPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let requirements: Awaited<ReturnType<typeof client.listAdminRequirements>>['requirements'] =
    [];
  let unavailable = false;

  try {
    const response = await client.listAdminRequirements({ limit: 50 });
    requirements = response.requirements;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requirements"
        description="Platform view of buyer demand. Buyer PII is limited to owner public ID."
      />

      {unavailable ? (
        <EmptyState
          title="Not available yet"
          description="Admin requirements API is unavailable for this session."
        />
      ) : requirements.length === 0 ? (
        <EmptyState
          title="No requirements yet."
          description="Marketplace and private requirements will appear here when seekers create them."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Public ID</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Budget</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((item) => (
                <tr key={item.publicId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{item.publicId}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={item.status === 'ACTIVE' ? 'success' : 'neutral'}>
                      {item.status}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {item.propertyType} · {item.transactionType}
                  </td>
                  <td className="px-4 py-3">
                    {[item.locality, item.city].filter(Boolean).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <PriceDisplay amountMinor={item.budgetMinMinor} size="sm" />
                    <span className="mx-1">–</span>
                    <PriceDisplay amountMinor={item.budgetMaxMinor} size="sm" emptyLabel="—" />
                  </td>
                  <td className="px-4 py-3">{item.ownerUserPublicId}</td>
                  <td className="px-4 py-3">
                    {new Date(item.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">{item.visibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Link href="/requirements" className="text-sm text-muted-foreground hover:text-foreground">
        View public marketplace →
      </Link>
    </div>
  );
}
