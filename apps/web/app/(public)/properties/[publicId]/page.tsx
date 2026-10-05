import { notFound } from 'next/navigation';
import { Breadcrumbs, EmptyState, PageHeader } from '@property-studio/ui';
import Link from 'next/link';

import { isPublicIdForKind } from '@/lib/public-id';

export const metadata = { title: 'Property' };

type PageProps = { params: Promise<{ publicId: string }> };

export default async function PublicPropertyPage({ params }: PageProps) {
  const { publicId } = await params;
  if (!isPublicIdForKind(publicId, 'property')) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            linkComponent={Link}
            items={[{ label: 'Properties', href: '/properties' }, { label: publicId }]}
          />
        }
        title={publicId}
        description="Property detail shell. Content will load from the catalog API in a later phase."
      />
      <EmptyState
        title="Property not available"
        description="No property record is published for this public ID yet."
      />
    </main>
  );
}
