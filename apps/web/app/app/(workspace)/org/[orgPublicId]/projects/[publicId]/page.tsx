export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { ProjectWorkspace } from '@/components/project-ops/project-workspace';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, requireSessionUser } from '@/lib/auth';
import { isPublicIdForKind } from '@/lib/public-id';
import { ErrorState } from '@property-studio/ui';

export const metadata = { title: 'Project' };

type PageProps = {
  params: Promise<{ orgPublicId: string; publicId: string }>;
};

export default async function OrganizationProjectDetailPage({ params }: PageProps) {
  const { orgPublicId, publicId } = await params;
  if (!isPublicIdForKind(orgPublicId, 'organization') || !isPublicIdForKind(publicId, 'project')) {
    notFound();
  }

  await requireSessionUser();
  const client = createServerApiClient(await getRequestCookieHeader());

  try {
    const [workspace, inventory] = await Promise.all([
      client.getProjectWorkspace(orgPublicId, publicId),
      client.listProjectInventory(orgPublicId, publicId, { limit: 50 }).catch(() => null),
    ]);

    if (workspace.project.organizationPublicId !== orgPublicId) {
      notFound();
    }

    return (
      <ProjectWorkspace orgPublicId={orgPublicId} workspace={workspace} inventory={inventory} />
    );
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    if (error instanceof ApiClientError) {
      return <ErrorState title="Unable to load project workspace" message={error.message} />;
    }
    throw error;
  }
}
