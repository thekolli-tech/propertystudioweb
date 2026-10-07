export const dynamic = 'force-dynamic';

import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin · External media' };

export default async function AdminExternalMediaPage() {
  const cookie = await getRequestCookieHeader();
  let unavailable = false;
  let list: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['listExternalMediaProviders']>
  > | null = null;

  try {
    list = await createServerApiClient(cookie).listExternalMediaProviders();
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="External providers"
        description="YouTube, Vimeo, and other external media providers. Status comes from configuration — unavailable providers stay unavailable."
      />
      {unavailable || !list ? (
        <EmptyState
          title="Providers unavailable"
          description="External media provider status could not be loaded for this session."
        />
      ) : list.providers.length === 0 ? (
        <EmptyState
          title="No providers registered"
          description="External media providers will appear here when registered in the platform."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.providers.map((provider) => (
            <li key={provider.provider} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{provider.provider}</Badge>
                <StatusBadge
                  tone={
                    provider.status === 'CONFIGURED'
                      ? 'success'
                      : provider.status === 'DISABLED'
                        ? 'warning'
                        : 'neutral'
                  }
                >
                  {provider.status}
                </StatusBadge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{provider.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
