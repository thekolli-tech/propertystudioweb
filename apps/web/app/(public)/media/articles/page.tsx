export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import { Badge, EmptyState, PageHeader } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Articles',
  description: 'Editorial articles and guides from Property Studio.',
};

export default async function MediaArticlesPage() {
  const cookie = await getRequestCookieHeader();
  const list = await createServerApiClient(cookie)
    .listPublicEditorial({ limit: 24 })
    .catch(() => ({ contents: [], nextCursor: null }));

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Articles"
        description="Published editorial content from the public editorial API."
        actions={
          <Link
            href="/media"
            className="rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            All media
          </Link>
        }
      />
      {list.contents.length === 0 ? (
        <EmptyState
          title="No articles yet"
          description="When editorial content is published, articles and guides will appear here."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.contents.map((item) => (
            <li
              key={item.publicId}
              className="rounded-[var(--radius)] border border-border bg-card p-4"
            >
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{item.kind}</Badge>
                {item.featured ? <Badge>Featured</Badge> : null}
              </div>
              <p className="mt-3 font-medium text-foreground">{item.title}</p>
              {item.excerpt ? (
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.excerpt}</p>
              ) : null}
              {item.publishedAt ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(item.publishedAt).toLocaleDateString()}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
