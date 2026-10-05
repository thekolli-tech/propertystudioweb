import { notFound } from 'next/navigation';
import { Breadcrumbs, EmptyState, PageHeader } from '@property-studio/ui';
import Link from 'next/link';

import { isPublicIdForKind } from '@/lib/public-id';

export const metadata = { title: 'Community' };

type PageProps = { params: Promise<{ publicId: string }> };

export default async function PublicCommunityPage({ params }: PageProps) {
  const { publicId } = await params;
  if (!isPublicIdForKind(publicId, 'community')) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            linkComponent={Link}
            items={[{ label: 'Communities' }, { label: publicId }]}
          />
        }
        title={publicId}
        description="Community detail shell prepared for future community API data."
      />
      <EmptyState
        title="Community not available"
        description="No community is published for this public ID yet."
      />
    </main>
  );
}
