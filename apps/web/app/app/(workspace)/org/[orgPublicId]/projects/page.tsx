export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, requireSessionUser } from '@/lib/auth';
import { isPublicIdForKind } from '@/lib/public-id';
import { ErrorState, PageHeader } from '@property-studio/ui';
import { ProjectCatalogManager } from '@/components/catalog/project-catalog-manager';

export const metadata = { title: 'Projects' };

type PageProps = { params: Promise<{ orgPublicId: string }> };

export default async function OrganizationProjectsPage({ params }: PageProps) {
  const { orgPublicId } = await params;
  if (!isPublicIdForKind(orgPublicId, 'organization')) {
    notFound();
  }

  await requireSessionUser();
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const organization = await client.getOrganization(orgPublicId);
    if (organization.type !== 'DEVELOPER') {
      return (
        <div>
          <PageHeader
            title="Projects"
            description="Projects are available for developer organizations."
          />
          <ErrorState
            title="Not available"
            message="Agency workspaces do not manage developer projects."
          />
        </div>
      );
    }

    const list = await client.listProjects({ organizationPublicId: orgPublicId, limit: 50 });
    return (
      <div className="space-y-6">
        <PageHeader
          title="Projects"
          description="Create, publish, and archive developer projects for this organization."
        />
        <ProjectCatalogManager organizationPublicId={orgPublicId} initialProjects={list.projects} />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 403 || error.status === 404)) {
      return <ErrorState title="Unable to load projects" message={error.message} />;
    }
    throw error;
  }
}
