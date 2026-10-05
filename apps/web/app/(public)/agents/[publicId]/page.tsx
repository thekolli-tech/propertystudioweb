import { notFound } from 'next/navigation';
import { Breadcrumbs, EmptyState, PageHeader } from '@property-studio/ui';
import Link from 'next/link';

import { isPublicIdForKind } from '@/lib/public-id';

export const metadata = { title: 'Agent' };

type PageProps = { params: Promise<{ publicId: string }> };

export default async function PublicAgentPage({ params }: PageProps) {
  const { publicId } = await params;
  if (!isPublicIdForKind(publicId, 'agent')) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs linkComponent={Link} items={[{ label: 'Agents' }, { label: publicId }]} />
        }
        title={publicId}
        description="Agent profile shell prepared for future agent API data."
      />
      <EmptyState
        title="Agent not available"
        description="No agent profile is published for this public ID yet."
      />
    </main>
  );
}
