export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { Badge, Breadcrumbs, EmptyState, PageHeader } from '@property-studio/ui';
import { VerifiedBadge } from '@/components/verified-badge';
import { isPublicIdForKind } from '@/lib/public-id';

export const metadata = { title: 'Agency' };

type PageProps = { params: Promise<{ publicId: string }> };

export default async function PublicAgentPage({ params }: PageProps) {
  const { publicId } = await params;
  if (!isPublicIdForKind(publicId, 'agent')) {
    notFound();
  }

  let profile: Awaited<ReturnType<ReturnType<typeof createServerApiClient>['getPublicAgent']>>;
  try {
    profile = await createServerApiClient().getPublicAgent(publicId);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    throw error;
  }

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
        description="Public agency profile. Private contact fields and admin notes are never exposed."
      />
      <section className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{profile.publicId}</Badge>
          <Badge variant="outline">{profile.organizationPublicId}</Badge>
          <VerifiedBadge verified={profile.verifiedBadge} label="Verified Expert" />
          {!profile.verifiedBadge ? (
            <Badge variant="outline">Professional verification required</Badge>
          ) : null}
        </div>
        {profile.description ? (
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            {profile.description}
          </p>
        ) : null}
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Specialization</dt>
            <dd className="font-medium text-foreground">
              {profile.specialization ?? 'Not published'}
            </dd>
          </div>
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
          {profile.verifiedBadge ? (
            <>
              <div>
                <dt className="text-muted-foreground">Property types</dt>
                <dd className="font-medium text-foreground">
                  {profile.propertyTypes.length
                    ? profile.propertyTypes.join(', ')
                    : 'Not published'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Configurations</dt>
                <dd className="font-medium text-foreground">
                  {profile.configurations.length
                    ? profile.configurations.join(', ')
                    : 'Not published'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Verification expires</dt>
                <dd className="font-medium text-foreground">
                  {profile.verificationExpiresAt
                    ? new Date(profile.verificationExpiresAt).toLocaleDateString('en-IN')
                    : 'Not published'}
                </dd>
              </div>
            </>
          ) : null}
          <div>
            <dt className="text-muted-foreground">Website</dt>
            <dd className="font-medium text-foreground">{profile.website ?? 'Not published'}</dd>
          </div>
        </dl>
        <EmptyState
          title="No public listings yet"
          description="Agency property assignment and requirement matching stay empty until those domains ship. Verified Expert badges are never shown without a real verification record."
        />
      </section>
    </main>
  );
}
