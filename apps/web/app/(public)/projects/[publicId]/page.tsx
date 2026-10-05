import { notFound } from 'next/navigation';
import { Breadcrumbs, EmptyState, PageHeader } from '@property-studio/ui';
import Link from 'next/link';

import { isPublicIdForKind } from '@/lib/public-id';

export const metadata = { title: 'Project' };

type PageProps = { params: Promise<{ publicId: string }> };

export default async function PublicProjectPage({ params }: PageProps) {
  const { publicId } = await params;
  if (!isPublicIdForKind(publicId, 'project')) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs linkComponent={Link} items={[{ label: 'Projects' }, { label: publicId }]} />
        }
        title={publicId}
        description="Project detail shell prepared for future project API data."
      />
      <EmptyState
        title="Project not available"
        description="No project is published for this public ID yet."
      />
    </main>
  );
}
