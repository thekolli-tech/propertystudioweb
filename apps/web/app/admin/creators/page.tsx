export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin · Creators' };

export default async function AdminCreatorsPage() {
  const cookie = await getRequestCookieHeader();
  let unavailable = false;
  let creator: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['getMyCreatorProfile']>
  > | null = null;

  try {
    creator = await createServerApiClient(cookie).getMyCreatorProfile();
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creators"
        description="Creator profiles for editorial and media attribution. Platform list endpoints appear when available — never invent creators."
      />
      {unavailable && !creator ? (
        <EmptyState
          title="No creator profile"
          description="No creator profile is linked to this session yet. Create one via the creators API when you need attribution."
        />
      ) : creator ? (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold">{creator.displayName}</h2>
            <StatusBadge tone={creator.isActive ? 'success' : 'neutral'}>
              {creator.isActive ? 'Active' : 'Inactive'}
            </StatusBadge>
          </div>
          {creator.headline ? (
            <p className="mt-2 text-sm text-muted-foreground">{creator.headline}</p>
          ) : null}
          {creator.bio ? <p className="mt-3 text-sm">{creator.bio}</p> : null}
          <p className="mt-3 text-xs text-muted-foreground">{creator.publicId}</p>
        </div>
      ) : (
        <EmptyState
          title="No creators to show"
          description="Creator records will appear here when the creators API returns data."
        />
      )}
    </div>
  );
}
