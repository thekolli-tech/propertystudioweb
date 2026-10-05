import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Button, EmptyState, PageHeader } from '@property-studio/ui';

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

    return (
      <div className="space-y-6">
        <PageHeader
          title="Overview"
          description="Developer workspace overview. Projects, properties, and leads arrive in later phases."
          actions={
            profile?.publicId ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/developers/${profile.publicId}`}>View public profile</Link>
              </Button>
            ) : null
          }
        />
        {profile ? (
          <section className="space-y-4 rounded-lg border border-border bg-card p-6">
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
                <dt className="text-muted-foreground">Organization ID</dt>
                <dd className="font-medium">{organization.publicId}</dd>
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
              <div>
                <dt className="text-muted-foreground">Contact</dt>
                <dd className="font-medium">
                  {[profile.contactEmail, profile.contactPhone].filter(Boolean).join(' · ') ||
                    'Not set'}
                </dd>
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
        <EmptyState
          title="No projects or properties yet"
          description="Catalog domains are intentionally deferred. Use Team to manage memberships."
        />
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

  return (
    <div className="space-y-6">
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
      <section className="rounded-lg border border-border bg-secondary/40 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">Professional verification required</p>
        <p className="mt-1 text-muted-foreground">
          Verification is required before professional marketplace access. Verification workflows
          are not implemented in this phase.
        </p>
      </section>
      {profile ? (
        <section className="space-y-4 rounded-lg border border-border bg-card p-6">
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
