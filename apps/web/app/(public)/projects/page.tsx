export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import Link from 'next/link';
import { EmptyState, PageHeader, ProjectCard, Skeleton } from '@property-studio/ui';

import { ProjectFilterBar } from '@/components/public/project-filter-bar';
import { createServerApiClient } from '@/lib/api';

export const metadata = { title: 'Projects' };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PublicProjectsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const list = await createServerApiClient()
    .listPublicProjects({
      city: first(params.city),
      state: first(params.state),
      locality: first(params.locality),
      microMarket: first(params.microMarket),
      projectType: first(params.projectType) as
        | 'RESIDENTIAL'
        | 'COMMERCIAL'
        | 'MIXED_USE'
        | 'PLOTTED'
        | 'OTHER'
        | undefined,
      limit: 24,
    })
    .catch(() => ({ projects: [], nextCursor: null }));

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Projects"
        description="Published developer projects across Property Studio — live catalog only."
      />
      <Suspense fallback={<Skeleton className="h-36 w-full rounded-xl" />}>
        <ProjectFilterBar />
      </Suspense>
      {list.projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Projects appear here after a developer organization publishes them."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.projects.map((project) => (
            <ProjectCard
              key={project.publicId}
              linkComponent={Link}
              href={`/projects/${project.publicId}`}
              name={project.name}
              publicId={project.publicId}
              developerName={project.developerDisplayName}
              location={[project.locality, project.city].filter(Boolean).join(', ')}
              projectType={project.projectType}
              startingPriceMinor={project.startingPriceMinor}
              currency={project.currency}
            />
          ))}
        </div>
      )}
    </main>
  );
}
