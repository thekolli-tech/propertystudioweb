export const dynamic = 'force-dynamic';

import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin · Media analytics' };

export default async function AdminMediaAnalyticsPage() {
  const cookie = await getRequestCookieHeader();
  let unavailable = false;
  let list: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['listAdminMediaAnalytics']>
  > | null = null;

  try {
    list = await createServerApiClient(cookie).listAdminMediaAnalytics({ limit: 50 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media analytics"
        description="Engagement events from the media analytics API. Empty when no events have been recorded."
      />
      {unavailable || !list ? (
        <EmptyState
          title="Analytics unavailable"
          description="Admin media analytics could not be loaded for this session."
        />
      ) : list.events.length === 0 ? (
        <EmptyState
          title="No analytics events"
          description="View, play, and engagement events will appear here when recorded. No fabricated metrics."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Media</th>
                <th className="px-4 py-3 font-medium">Editorial</th>
                <th className="px-4 py-3 font-medium">Occurred</th>
              </tr>
            </thead>
            <tbody>
              {list.events.map((row) => (
                <tr key={row.publicId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Badge variant="outline">{row.eventType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.mediaPublicId ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.editorialPublicId ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="neutral">
                      {new Date(row.occurredAt).toLocaleString()}
                    </StatusBadge>
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
