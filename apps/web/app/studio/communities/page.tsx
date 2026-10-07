export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Studio · Communities' };

export default async function StudioCommunitiesPage() {
  const cookie = await getRequestCookieHeader();
  const list = await createServerApiClient(cookie)
    .listCommunities({ limit: 24 })
    .catch(() => ({ communities: [], nextCursor: null }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communities"
        description="Communities from the catalog API. Nothing is invented for broadcast."
      />
      {list.communities.length === 0 ? (
        <EmptyState
          title="No communities yet"
          description="Published communities will appear here when available from the catalog."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.communities.map((community) => (
            <li key={community.publicId}>
              <Link
                href={`/communities/${community.publicId}`}
                className="ps-broadcast-touch ps-broadcast-chart block rounded-[var(--radius)] border-2 border-border bg-card p-5 active:bg-muted"
              >
                <p className="font-display text-[calc(1.05rem*var(--broadcast-scale))] font-[number:var(--broadcast-weight)]">
                  {community.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{community.publicId}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {community.status} · {community.visibility}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
