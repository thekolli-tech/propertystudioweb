export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, EmptyState, PageHeader } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Videos',
  description: 'Public video media from Property Studio.',
};

export default async function MediaVideosPage() {
  const cookie = await getRequestCookieHeader();
  const list = await createServerApiClient(cookie)
    .listPublicMedia({ limit: 24, mediaType: 'VIDEO' })
    .catch(() => ({ media: [], nextCursor: null }));

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Videos"
        description="Published video assets from the public media API. No invented galleries."
        actions={
          <Link
            href="/media"
            className="rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            All media
          </Link>
        }
      />
      {list.media.length === 0 ? (
        <EmptyState
          title="No public videos yet"
          description="When video assets are published and approved, they will appear here."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.media.map((item) => {
            const href = item.slug ? `/media/${item.slug}` : `/media/${item.publicId}`;
            return (
              <li key={item.publicId}>
                <Link
                  href={href}
                  className="block rounded-[var(--radius)] border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <Badge variant="outline">VIDEO</Badge>
                  <p className="mt-3 font-medium">{item.title ?? item.slug ?? item.publicId}</p>
                  {item.durationSeconds != null ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {Math.round(item.durationSeconds / 60)} min
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
