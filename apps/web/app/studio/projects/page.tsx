export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, ProjectCard } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Studio · Projects' };

export default async function StudioProjectsPage() {
  const cookie = await getRequestCookieHeader();
  const list = await createServerApiClient(cookie)
    .listPublicProjects({ limit: 24 })
    .catch(() => ({ projects: [], nextCursor: null }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Select a project to open its broadcast presentation. Only published developments are shown."
      />
      {list.projects.length === 0 ? (
        <EmptyState
          title="No projects to present"
          description="When developers publish projects, they will appear here for Broadcast Studio."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.projects.map((project) => (
            <ProjectCard
              key={project.publicId}
              linkComponent={Link}
              href={`/studio/projects/${project.publicId}`}
              name={project.name}
              publicId={project.publicId}
              location={[project.locality, project.city].filter(Boolean).join(', ')}
              projectType={project.projectType}
              startingPriceMinor={project.startingPriceMinor}
              currency={project.currency}
            />
          ))}
        </div>
      )}
    </div>
  );
}
