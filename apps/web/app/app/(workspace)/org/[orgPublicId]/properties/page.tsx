export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, requireSessionUser } from '@/lib/auth';
import { isPublicIdForKind } from '@/lib/public-id';
import { ErrorState, PageHeader } from '@property-studio/ui';
import { PropertyCatalogManager } from '@/components/catalog/property-catalog-manager';

export const metadata = { title: 'Properties' };

type PageProps = { params: Promise<{ orgPublicId: string }> };

export default async function OrganizationPropertiesPage({ params }: PageProps) {
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
            title="Properties"
            description="Developer catalog management is limited to developer organizations in this phase."
          />
          <ErrorState
            title="Developer catalog only"
            message="Agency workspaces can discover public listings; private catalog mutation is developer-owned."
          />
        </div>
      );
    }

    const [properties, projects] = await Promise.all([
      client.listProperties({ organizationPublicId: orgPublicId, limit: 50 }),
      client.listProjects({ organizationPublicId: orgPublicId, limit: 100 }),
    ]);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Properties"
          description="Manage listings, publication, and availability for this developer organization."
        />
        <PropertyCatalogManager
          organizationPublicId={orgPublicId}
          projectOptions={projects.projects.map((project) => ({
            publicId: project.publicId,
            name: project.name,
          }))}
          initialProperties={properties.properties}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 403 || error.status === 404)) {
      return <ErrorState title="Unable to load properties" message={error.message} />;
    }
    throw error;
  }
}
