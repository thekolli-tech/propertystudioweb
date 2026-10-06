export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Badge,
  Breadcrumbs,
  EmptyState,
  PageHeader,
  ProjectCard,
  PropertyCard,
} from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { isPublicIdForKind } from '@/lib/public-id';

export const metadata = { title: 'Developer' };

type PageProps = { params: Promise<{ publicId: string }> };

export default async function PublicDeveloperPage({ params }: PageProps) {
  const { publicId } = await params;
  if (!isPublicIdForKind(publicId, 'developer')) {
    notFound();
  }

  const client = createServerApiClient();
  let profile: Awaited<ReturnType<typeof client.getPublicDeveloper>>;
  try {
    profile = await client.getPublicDeveloper(publicId);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  // Public catalog does not yet filter by developerPublicId — show honest empty unless
  // we can match developer display name on published projects (best-effort, live only).
  const projects = await client
    .listPublicProjects({ limit: 24 })
    .catch(() => ({ projects: [], nextCursor: null }));
  const matchedProjects = projects.projects.filter(
    (project) => project.developerPublicId === publicId,
  );
  const properties = matchedProjects.length
    ? await Promise.all(
        matchedProjects
          .slice(0, 3)
          .map((project) =>
            client
              .listPublicProperties({ projectPublicId: project.publicId, limit: 4 })
              .catch(() => ({ properties: [], nextCursor: null })),
          ),
      ).then((lists) => lists.flatMap((list) => list.properties))
    : [];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            linkComponent={Link}
            items={[{ label: 'Home', href: '/' }, { label: profile.displayName }]}
          />
        }
        title={profile.displayName}
        description="Public developer profile sourced from live organization profile APIs."
      />
      <section className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{profile.publicId}</Badge>
          <Badge variant="outline">{profile.organizationPublicId}</Badge>
        </div>
        {profile.description ? (
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            {profile.description}
          </p>
        ) : null}
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Headquarters</dt>
            <dd className="font-medium text-foreground">
              {[profile.headquartersCity, profile.headquartersState].filter(Boolean).join(', ') ||
                'Not published'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Operating zones</dt>
            <dd className="font-medium text-foreground">
              {profile.operatingZones.length ? profile.operatingZones.join(', ') : 'Not published'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Website</dt>
            <dd className="font-medium text-foreground">{profile.website ?? 'Not published'}</dd>
          </div>
        </dl>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Projects</h2>
          {matchedProjects.length === 0 ? (
            <EmptyState
              title="No public projects yet"
              description="Published projects linked to this developer will appear here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {matchedProjects.map((project) => (
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
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold">Properties</h2>
          {properties.length === 0 ? (
            <EmptyState
              title="No public properties yet"
              description="Published units for this developer’s projects will appear here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {properties.map((property) => (
                <PropertyCard
                  key={property.publicId}
                  linkComponent={Link}
                  href={`/properties/${property.publicId}`}
                  title={property.title}
                  publicId={property.publicId}
                  location={[property.locality, property.city].filter(Boolean).join(', ')}
                  configuration={property.configuration}
                  bedrooms={property.bedrooms}
                  priceMinor={property.priceMinor}
                  currency={property.currency}
                  availabilityStatus={property.availabilityStatus}
                />
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
