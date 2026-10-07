export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Button, EmptyState, PageHeader } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin · Broadcast' };

export default async function AdminBroadcastPage() {
  const cookie = await getRequestCookieHeader();
  let unavailable = false;
  let config: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['getBroadcastStudioConfig']>
  > | null = null;

  try {
    config = await createServerApiClient(cookie).getBroadcastStudioConfig();
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Broadcast"
        description="Broadcast Studio configuration for large-display presentation mode."
        actions={
          <Button asChild variant="outline">
            <Link href="/studio">Open Broadcast Studio</Link>
          </Button>
        }
      />
      {unavailable || !config ? (
        <EmptyState
          title="Broadcast config unavailable"
          description="Broadcast studio configuration could not be loaded for this session."
        />
      ) : (
        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Name
            </p>
            <p className="mt-1 font-medium">{config.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Default home route
            </p>
            <p className="mt-1 font-medium">{config.defaultHomeRoute}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Touch target min (px)
            </p>
            <p className="mt-1 font-medium">{config.touchTargetMinPx}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Enabled sections
            </p>
            {config.enabledSections.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">No sections configured yet.</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {config.enabledSections.map((section) => (
                  <li
                    key={section}
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium"
                  >
                    {section}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
