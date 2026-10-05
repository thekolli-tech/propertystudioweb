import { EmptyState, PageHeader } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';
import { isPublicIdForKind } from '@/lib/public-id';
import { notFound } from 'next/navigation';

type PageProps = { params: Promise<{ orgPublicId: string }> };

export const metadata = { title: 'Organization' };

export default async function OrganizationOverviewPage({ params }: PageProps) {
  const { orgPublicId } = await params;
  if (!isPublicIdForKind(orgPublicId, 'organization')) {
    notFound();
  }

  const cookieHeader = await getRequestCookieHeader();
  let name = orgPublicId;
  try {
    const org = await createServerApiClient(cookieHeader).getOrganization(orgPublicId);
    name = org.name;
  } catch {
    // Layout handles access errors; overview still renders a shell when nested.
  }

  return (
    <div>
      <PageHeader title="Overview" description={`Workspace overview for ${name}.`} />
      <EmptyState
        title="Organization overview coming soon"
        description="Metrics, recent activity, and publishing status will appear here in later phases."
      />
    </div>
  );
}
