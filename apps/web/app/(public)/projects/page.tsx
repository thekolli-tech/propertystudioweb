export const dynamic = 'force-dynamic';

import { createServerApiClient } from '@/lib/api';
import { EmptyState, PageHeader, Badge } from '@property-studio/ui';
import Link from 'next/link';

export const metadata = { title: 'Projects' };

export default async function PublicProjectsPage() {
  const list = await createServerApiClient().listPublicProjects({ limit: 24 });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Projects"
        description="Published developer projects across Property Studio."
      />
      {list.projects.length === 0 ? (
        <EmptyState
          title="No published projects yet"
          description="Projects appear here after a developer organization publishes them."
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {list.projects.map((project) => (
            <li key={project.publicId} className="py-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <div className="space-y-1">
                  <Link
                    href={`/projects/${project.publicId}`}
                    className="text-lg font-semibold text-foreground hover:underline"
                  >
                    {project.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {project.developerDisplayName ?? 'Developer'}
                    {project.city ? ` · ${project.city}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{project.publicId}</Badge>
                  <Badge variant="outline">{project.projectType.replaceAll('_', ' ')}</Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
