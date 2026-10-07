export const dynamic = 'force-dynamic';

import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin · Collections' };

export default async function AdminCollectionsPage() {
  const cookie = await getRequestCookieHeader();
  let unavailable = false;
  let list: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['listAdminCollections']>
  > | null = null;

  try {
    list = await createServerApiClient(cookie).listAdminCollections({ limit: 50 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collections"
        description="Media and editorial collections. Empty when none have been created."
      />
      {unavailable || !list ? (
        <EmptyState
          title="Collections unavailable"
          description="Admin collections API could not be loaded for this session."
        />
      ) : list.collections.length === 0 ? (
        <EmptyState
          title="No collections"
          description="Collections will appear here when created in the media CMS."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
                <th className="px-4 py-3 font-medium">Items</th>
              </tr>
            </thead>
            <tbody>
              {list.collections.map((row) => (
                <tr key={row.publicId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground">{row.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="neutral">{row.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{row.visibility}</Badge>
                  </td>
                  <td className="px-4 py-3">{row.itemCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
