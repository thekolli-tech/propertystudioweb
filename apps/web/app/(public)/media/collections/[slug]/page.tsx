export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge, EmptyState, PageHeader } from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const cookie = await getRequestCookieHeader();
  try {
    const collection = await createServerApiClient(cookie).getPublicCollection(slug);
    const seo = collection.seo;
    if (!seo.indexable) {
      return { title: collection.title, robots: { index: false, follow: false } };
    }
    return {
      title: seo.seoTitle ?? collection.title,
      description: seo.seoDescription ?? collection.description ?? undefined,
      alternates: seo.canonicalPath ? { canonical: seo.canonicalPath } : undefined,
      openGraph: {
        title: seo.ogTitle ?? seo.seoTitle ?? collection.title,
        description: seo.ogDescription ?? seo.seoDescription ?? collection.description ?? undefined,
      },
      twitter: {
        title: seo.twitterTitle ?? seo.seoTitle ?? collection.title,
        description:
          seo.twitterDescription ?? seo.seoDescription ?? collection.description ?? undefined,
      },
    };
  } catch {
    return { title: 'Collection' };
  }
}

export default async function MediaCollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const cookie = await getRequestCookieHeader();

  let collection = null;
  try {
    collection = await createServerApiClient(cookie).getPublicCollection(slug);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
  }

  if (!collection) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <PageHeader title="Collection" />
        <EmptyState
          title="Collection unavailable"
          description="This collection could not be loaded from the public collections API."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        title={collection.title}
        description={collection.description ?? undefined}
        actions={
          <Link
            href="/media"
            className="rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            All media
          </Link>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{collection.status}</Badge>
        {collection.category ? <Badge variant="secondary">{collection.category}</Badge> : null}
      </div>
      {collection.items.length === 0 ? (
        <EmptyState
          title="Empty collection"
          description="This collection has no published items yet."
        />
      ) : (
        <ul className="space-y-3">
          {collection.items.map((item) => (
            <li
              key={item.publicId}
              className="rounded-[var(--radius)] border border-border bg-card px-4 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{item.itemKind}</Badge>
                <span className="font-medium">
                  {item.title ?? item.mediaPublicId ?? item.editorialPublicId ?? item.publicId}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
