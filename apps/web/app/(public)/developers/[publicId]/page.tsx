import { notFound } from 'next/navigation';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { EmptyState, PageHeader, Badge } from '@property-studio/ui';
import { isPublicIdForKind } from '@/lib/public-id';
import { Breadcrumbs } from '@property-studio/ui';
import Link from 'next/link';

export const metadata = { title: 'Developer' };

type PageProps = { params: Promise<{ publicId: string }> };

export default async function PublicDeveloperPage({ params }: PageProps) {
  const { publicId } = await params;
  if (!isPublicIdForKind(publicId, 'developer')) {
    notFound();
  }

  let profile: Awaited<ReturnType<ReturnType<typeof createServerApiClient>['getPublicDeveloper']>>;
  try {
    profile = await createServerApiClient().getPublicDeveloper(publicId);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            linkComponent={Link}
            items={[{ label: 'Developers', href: '/' }, { label: profile.displayName }]}
          />
        }
        title={profile.displayName}
        description="Public developer profile. Projects and properties will appear here when published."
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
        <EmptyState
          title="No public projects or properties yet"
          description="Listings and trust signals will appear when those domains ship. Contact details stay private."
        />
      </section>
    </main>
  );
}
