import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Badge,
  Button,
  DashboardSection,
  EmptyState,
  PageHeader,
  ProjectCard,
  PropertyCard,
  StatCard,
} from '@property-studio/ui';
import { Building2, FolderKanban, Home, Users } from 'lucide-react';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';
import { isPublicIdForKind } from '@/lib/public-id';

type PageProps = { params: Promise<{ orgPublicId: string }> };

export const metadata = { title: 'Organization overview' };

export default async function OrganizationOverviewPage({ params }: PageProps) {
  const { orgPublicId } = await params;
  if (!isPublicIdForKind(orgPublicId, 'organization')) {
    notFound();
  }

  const cookieHeader = await getRequestCookieHeader();
  const client = createServerApiClient(cookieHeader);

  let organization: Awaited<ReturnType<typeof client.getOrganization>>;
  try {
    organization = await client.getOrganization(orgPublicId);
  } catch {
    notFound();
  }

  if (organization.type === 'DEVELOPER') {
    let profile: Awaited<ReturnType<typeof client.getDeveloperProfile>> | null = null;
    try {
      profile = await client.getDeveloperProfile(orgPublicId);
    } catch (error) {
      if (!(error instanceof ApiClientError && error.status === 404)) {
        throw error;
      }
    }

    const [projects, properties, members] = await Promise.all([
      client
        .listProjects({ organizationPublicId: orgPublicId, limit: 6 })
        .catch(() => ({ projects: [], nextCursor: null })),
      client
        .listProperties({ organizationPublicId: orgPublicId, limit: 6 })
        .catch(() => ({ properties: [], nextCursor: null })),
      client.listOrganizationMembers(orgPublicId).catch(() => ({ members: [] })),
    ]);

    return (
      <div className="space-y-8">
        <PageHeader
          title="Overview"
          description="Developer workspace — live catalog and team data only."
          actions={
            profile?.publicId ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/developers/${profile.publicId}`}>View public profile</Link>
              </Button>
            ) : null
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Projects"
            value={projects.projects.length}
            hint="Sample of projects you can list for this organization."
            icon={<FolderKanban className="h-4 w-4" />}
          />
          <StatCard
            label="Properties"
            value={properties.properties.length}
            hint="Sample of properties in this organization catalog."
            icon={<Home className="h-4 w-4" />}
          />
          <StatCard
            label="Team"
            value={members.members.length}
            hint="Members returned by the organization team API."
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            label="Leads"
            value={null}
            unavailable
            hint="Lead marketplace APIs are not available yet."
            icon={<Building2 className="h-4 w-4" />}
          />
        </div>

        {profile ? (
          <section className="space-y-4 rounded-xl border border-border bg-card p-6 ps-card-elevated">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xl font-semibold">{profile.displayName}</h2>
              <Badge variant="secondary">{organization.role}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{profile.legalName}</p>
            {profile.description ? (
              <p className="text-sm leading-relaxed">{profile.description}</p>
            ) : null}
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Profile ID</dt>
                <dd className="font-medium">{profile.publicId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Headquarters</dt>
                <dd className="font-medium">
                  {[profile.headquartersCity, profile.headquartersState]
                    .filter(Boolean)
                    .join(', ') || 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Operating zones</dt>
                <dd className="font-medium">
                  {profile.operatingZones.length ? profile.operatingZones.join(', ') : 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Website</dt>
                <dd className="font-medium">{profile.website ?? 'Not set'}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <EmptyState
            title="Developer profile incomplete"
            description="Complete onboarding to create a developer profile for this organization."
            action={
              <Button asChild>
                <Link href="/app/onboarding">Create profile</Link>
              </Button>
            }
          />
        )}

        <DashboardSection
          title="Projects"
          description="Live organization projects."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/org/${orgPublicId}/projects`}>Manage</Link>
            </Button>
          }
        >
          {projects.projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description="Create a project from the Projects workspace to populate this overview."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {projects.projects.map((project) => (
                <ProjectCard
                  key={project.publicId}
                  variant="row"
                  linkComponent={Link}
                  href={`/app/org/${orgPublicId}/projects/${project.publicId}`}
                  name={project.name}
                  publicId={project.publicId}
                  location={[project.locality, project.city].filter(Boolean).join(', ')}
                  startingPriceMinor={project.startingPriceMinor}
                  currency={project.currency}
                />
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection
          title="Properties"
          description="Live organization listings."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={`/app/org/${orgPublicId}/properties`}>Manage</Link>
            </Button>
          }
        >
          {properties.properties.length === 0 ? (
            <EmptyState
              title="No properties yet"
              description="Add inventory from the Properties workspace."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {properties.properties.map((property) => (
                <PropertyCard
                  key={property.publicId}
                  linkComponent={Link}
                  href={`/app/org/${orgPublicId}/properties/${property.publicId}`}
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
        </DashboardSection>
      </div>
    );
  }

  let profile: Awaited<ReturnType<typeof client.getAgencyProfile>> | null = null;
  try {
    profile = await client.getAgencyProfile(orgPublicId);
  } catch (error) {
    if (!(error instanceof ApiClientError && error.status === 404)) {
      throw error;
    }
  }

  const members = await client.listOrganizationMembers(orgPublicId).catch(() => ({ members: [] }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Agency workspace overview. Marketplace and CRM domains arrive later."
        actions={
          profile?.publicId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/agents/${profile.publicId}`}>View public profile</Link>
            </Button>
          ) : null
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Team"
          value={members.members.length}
          hint="Members from the organization team API."
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Requirements"
          value={null}
          unavailable
          hint="Requirement marketplace APIs are not available yet."
        />
        <StatCard label="Leads" value={null} unavailable hint="Lead APIs are not available yet." />
      </div>
      <section className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">Professional verification required</p>
        <p className="mt-1 text-muted-foreground">
          Verification is required before professional marketplace access. Verification workflows
          are not fully implemented in this phase.
        </p>
      </section>
      {profile ? (
        <section className="space-y-4 rounded-xl border border-border bg-card p-6 ps-card-elevated">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold">{profile.displayName}</h2>
            <Badge variant="secondary">{organization.role}</Badge>
            <Badge variant="outline">{profile.verificationStatus}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{profile.legalName}</p>
          {profile.description ? (
            <p className="text-sm leading-relaxed">{profile.description}</p>
          ) : null}
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Profile ID</dt>
              <dd className="font-medium">{profile.publicId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Specialization</dt>
              <dd className="font-medium">{profile.specialization ?? 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Headquarters</dt>
              <dd className="font-medium">
                {[profile.headquartersCity, profile.headquartersState].filter(Boolean).join(', ') ||
                  'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Operating zones</dt>
              <dd className="font-medium">
                {profile.operatingZones.length ? profile.operatingZones.join(', ') : 'Not set'}
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <EmptyState
          title="Agency profile incomplete"
          description="Complete onboarding to create an agency profile for this organization."
        />
      )}
      <EmptyState
        title="No listings or requirements yet"
        description="Marketplace domains are intentionally deferred. Use Team to manage memberships."
      />
    </div>
  );
}
