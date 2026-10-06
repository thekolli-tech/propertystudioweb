export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Badge, EmptyState, PageHeader } from '@property-studio/ui';

import { MediaGalleryPanel } from '@/components/studio/media-gallery-panel';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Studio · Media' };

export default async function StudioMediaPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  const [mediaResult, editorialResult, collectionsResult] = await Promise.all([
    client.listPublicMedia({ limit: 24 }).catch(() => ({ media: [], nextCursor: null })),
    client.listPublicEditorial({ limit: 12 }).catch(() => ({ contents: [], nextCursor: null })),
    client.listPublicCollections({ limit: 12 }).catch(() => ({ collections: [], nextCursor: null })),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Media"
        description="Public media, editorial, and collections from the CMS. Empty when nothing is published."
      />

      <MediaGalleryPanel media={mediaResult.media} />

      <section className="space-y-4">
        <h2 className="font-display text-[calc(1.125rem*var(--broadcast-scale))] font-[number:var(--broadcast-weight)]">
          Editorial
        </h2>
        {editorialResult.contents.length === 0 ? (
          <EmptyState
            title="No editorial content"
            description="Published articles and guides will appear here from the editorial API."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {editorialResult.contents.map((item) => (
              <li
                key={item.publicId}
                className="ps-broadcast-chart rounded-[var(--radius)] border-2 border-border bg-card p-4"
              >
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{item.kind}</Badge>
                  {item.featured ? <Badge>Featured</Badge> : null}
                </div>
                <Link
                  href={`/media/articles`}
                  className="mt-3 block font-medium text-foreground underline-offset-4 active:underline"
                >
                  {item.title}
                </Link>
                {item.excerpt ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-[calc(1.125rem*var(--broadcast-scale))] font-[number:var(--broadcast-weight)]">
          Collections
        </h2>
        {collectionsResult.collections.length === 0 ? (
          <EmptyState
            title="No collections"
            description="Published media collections will appear here when available."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {collectionsResult.collections.map((item) => (
              <li key={item.publicId}>
                <Link
                  href={`/media/collections/${item.slug}`}
                  className="ps-broadcast-touch ps-broadcast-chart block rounded-[var(--radius)] border-2 border-border bg-card p-4 active:bg-muted"
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.itemCount} item{item.itemCount === 1 ? '' : 's'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
