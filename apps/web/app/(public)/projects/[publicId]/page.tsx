export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { isPublicIdForKind } from '@/lib/public-id';
import { Badge, Breadcrumbs, EmptyState, PageHeader } from '@property-studio/ui';
import Link from 'next/link';

export const metadata = { title: 'Project' };

type PageProps = { params: Promise<{ publicId: string }> };

export default async function PublicProjectPage({ params }: PageProps) {
  const { publicId } = await params;
  if (!isPublicIdForKind(publicId, 'project')) {
    notFound();
  }

  let project: Awaited<ReturnType<ReturnType<typeof createServerApiClient>['getPublicProject']>>;
  try {
    project = await createServerApiClient().getPublicProject(publicId);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const properties = await createServerApiClient().listPublicProperties({
    projectPublicId: publicId,
    limit: 12,
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            linkComponent={Link}
            items={[{ label: 'Projects', href: '/projects' }, { label: project.name }]}
          />
        }
        title={project.name}
        description={project.description ?? 'Published project details.'}
      />
      <section className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{project.publicId}</Badge>
          <Badge variant="outline">{project.projectType.replaceAll('_', ' ')}</Badge>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Developer</dt>
            <dd className="font-medium">
              {project.developerPublicId ? (
                <Link href={`/developers/${project.developerPublicId}`} className="hover:underline">
                  {project.developerDisplayName ?? project.developerPublicId}
                </Link>
              ) : (
                'Not published'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Location</dt>
            <dd className="font-medium">
              {[project.locality, project.city, project.state].filter(Boolean).join(', ') ||
                'Not published'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Starting price</dt>
            <dd className="font-medium">
              {project.startingPriceMinor
                ? new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: project.currency,
                    maximumFractionDigits: 0,
                  }).format(Number(project.startingPriceMinor) / 100)
                : 'On request'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Units</dt>
            <dd className="font-medium">{project.totalUnits ?? 'Not published'}</dd>
          </div>
        </dl>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Properties</h2>
          {properties.properties.length === 0 ? (
            <EmptyState
              title="No published properties"
              description="Units for this project will appear when published."
            />
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {properties.properties.map((property) => (
                <li key={property.publicId} className="py-3">
                  <Link
                    href={`/properties/${property.publicId}`}
                    className="font-medium hover:underline"
                  >
                    {property.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: property.currency,
                      maximumFractionDigits: 0,
                    }).format(Number(property.priceMinor) / 100)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Media</h2>
          <p className="text-sm text-muted-foreground">
            {project.media.length
              ? `${project.media.length} public media asset(s).`
              : 'No public media yet.'}
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">
            {project.documents.length
              ? `${project.documents.length} public document(s).`
              : 'No public documents yet.'}
          </p>
        </section>
      </section>
    </main>
  );
}
