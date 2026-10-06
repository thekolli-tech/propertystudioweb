export const dynamic = 'force-dynamic';

import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin · Media' };

export default async function AdminMediaPage() {
  const cookie = await getRequestCookieHeader();
  let unavailable = false;
  let list: Awaited<ReturnType<ReturnType<typeof createServerApiClient>['listAdminMedia']>> | null =
    null;

  try {
    list = await createServerApiClient(cookie).listAdminMedia({ limit: 50 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media"
        description="Platform media CMS inventory. Empty when no assets exist — analytics are never invented."
      />
      {unavailable || !list ? (
        <EmptyState
          title="Media list unavailable"
          description="Admin media API could not be loaded for this session."
        />
      ) : list.media.length === 0 ? (
        <EmptyState
          title="No media assets"
          description="Media assets will appear here when uploaded and registered in the CMS."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Lifecycle</th>
                <th className="px-4 py-3 font-medium">Moderation</th>
                <th className="px-4 py-3 font-medium">Visibility</th>
              </tr>
            </thead>
            <tbody>
              {list.media.map((row) => (
                <tr key={row.publicId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.title ?? row.slug ?? row.publicId}</div>
                    <div className="text-xs text-muted-foreground">{row.publicId}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{row.mediaType}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="neutral">{row.lifecycleStatus}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="neutral">{row.moderationStatus}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">{row.visibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
