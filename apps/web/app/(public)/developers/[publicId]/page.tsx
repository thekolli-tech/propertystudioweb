import { notFound } from 'next/navigation';
import { Breadcrumbs, EmptyState, PageHeader } from '@property-studio/ui';
import Link from 'next/link';

import { isPublicIdForKind } from '@/lib/public-id';

export const metadata = { title: 'Developer' };

type PageProps = { params: Promise<{ publicId: string }> };

export default async function PublicDeveloperPage({ params }: PageProps) {
  const { publicId } = await params;
  if (!isPublicIdForKind(publicId, 'developer')) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            linkComponent={Link}
            items={[{ label: 'Developers' }, { label: publicId }]}
          />
        }
        title={publicId}
        description="Developer profile shell prepared for future developer API data."
      />
      <EmptyState
        title="Developer not available"
        description="No developer profile is published for this public ID yet."
      />
    </main>
  );
}
