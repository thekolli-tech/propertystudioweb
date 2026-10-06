export const dynamic = 'force-dynamic';

import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin · Content' };

export default async function AdminContentPage() {
  const cookie = await getRequestCookieHeader();
  let unavailable = false;
  let list: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['listAdminEditorial']>
  > | null = null;

  try {
    list = await createServerApiClient(cookie).listAdminEditorial({ limit: 50 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content"
        description="Editorial CMS (articles, guides, explainers). Empty when no content exists."
      />
      {unavailable || !list ? (
        <EmptyState
          title="Editorial list unavailable"
          description="Admin editorial API could not be loaded for this session."
        />
      ) : list.contents.length === 0 ? (
        <EmptyState
          title="No editorial content"
          description="Draft and published editorial records will appear here when created."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Moderation</th>
              </tr>
            </thead>
            <tbody>
              {list.contents.map((row) => (
                <tr key={row.publicId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground">{row.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{row.kind}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="neutral">{row.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="neutral">{row.moderationStatus}</StatusBadge>
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
