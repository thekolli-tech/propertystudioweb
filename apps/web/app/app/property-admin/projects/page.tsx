import Link from 'next/link';
import { EmptyState, PageHeader, ProjectCard } from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Assigned projects' };

export default async function PropertyAdminProjectsPage() {
  const cookie = await getRequestCookieHeader();
  let properties: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['listProperties']>
  >['properties'] = [];

  try {
    properties = (await createServerApiClient(cookie).listProperties({ limit: 100 })).properties;
  } catch (error) {
    if (!(error instanceof ApiClientError)) throw error;
  }

  const projectIds = [
    ...new Set(
      properties
        .map((item) => item.projectPublicId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assigned projects"
        description="Projects linked from your assigned properties. Dedicated project assignment listing is not a separate API yet."
      />
      {projectIds.length === 0 ? (
        <EmptyState
          title="No assigned projects"
          description="Projects appear when assigned properties are linked to a project."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projectIds.map((publicId) => (
            <ProjectCard
              key={publicId}
              linkComponent={Link}
              href={`/projects/${publicId}`}
              name={publicId}
              publicId={publicId}
              location="Linked from assigned properties"
            />
          ))}
        </div>
      )}
    </div>
  );
}
