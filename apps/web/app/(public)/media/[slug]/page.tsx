export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
    const media = await createServerApiClient(cookie).getPublicMedia(slug);
    const seo = media.seo;
    if (!seo.indexable) {
      return { title: media.title ?? 'Media', robots: { index: false, follow: false } };
    }
    return {
      title: seo.seoTitle ?? media.title ?? 'Media',
      description: seo.seoDescription ?? media.description ?? undefined,
      alternates: seo.canonicalPath ? { canonical: seo.canonicalPath } : undefined,
      openGraph: {
        title: seo.ogTitle ?? seo.seoTitle ?? media.title ?? undefined,
        description: seo.ogDescription ?? seo.seoDescription ?? media.description ?? undefined,
      },
      twitter: {
        title: seo.twitterTitle ?? seo.seoTitle ?? media.title ?? undefined,
        description: seo.twitterDescription ?? seo.seoDescription ?? media.description ?? undefined,
      },
    };
  } catch {
    return { title: 'Media' };
  }
}

export default async function MediaDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const cookie = await getRequestCookieHeader();

  let media = null;
  try {
    media = await createServerApiClient(cookie).getPublicMedia(slug);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
  }

  if (!media) {
    return (
      <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <PageHeader title="Media" />
        <EmptyState
          title="Media unavailable"
          description="This media asset could not be loaded from the public media API."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        title={media.title ?? media.slug ?? media.publicId}
        description={media.description ?? media.caption ?? undefined}
      />
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{media.mediaType}</Badge>
        {media.category ? <Badge variant="secondary">{media.category}</Badge> : null}
        {media.tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>
      {media.accessUrlAvailable ? (
        <p className="text-sm text-muted-foreground">
          Signed delivery is available for this asset via the media access API.
        </p>
      ) : (
        <EmptyState
          title="Preview not available"
          description="A public access URL is not available for this asset yet. Metadata above is from the live CMS record."
        />
      )}
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Public id</dt>
          <dd className="font-medium">{media.publicId}</dd>
        </div>
        {media.publishedAt ? (
          <div>
            <dt className="text-muted-foreground">Published</dt>
            <dd className="font-medium">{new Date(media.publishedAt).toLocaleDateString()}</dd>
          </div>
        ) : null}
        {media.source ? (
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-medium">{media.source}</dd>
          </div>
        ) : null}
      </dl>
    </main>
  );
}
