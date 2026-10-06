export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, EmptyState, PageHeader } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Media',
  description: 'Public media from Property Studio — photos, videos, and assets from published records.',
};

export default async function MediaPage() {
  const cookie = await getRequestCookieHeader();
  const list = await createServerApiClient(cookie)
    .listPublicMedia({ limit: 24 })
    .catch(() => ({ media: [], nextCursor: null }));

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Media"
        description="Public media discovery from the media CMS. Empty catalogs stay empty."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/media/videos"
              className="rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Videos
            </Link>
            <Link
              href="/media/articles"
              className="rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Articles
            </Link>
          </div>
        }
      />
      {list.media.length === 0 ? (
        <EmptyState
          title="No public media yet"
          description="When projects and properties publish public media assets, they will appear here from live records."
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
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{item.mediaType}</Badge>
                    {item.category ? <Badge variant="secondary">{item.category}</Badge> : null}
                  </div>
                  <p className="mt-3 font-medium text-foreground">
                    {item.title ?? item.slug ?? item.publicId}
                  </p>
                  {item.caption || item.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.caption ?? item.description}
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
