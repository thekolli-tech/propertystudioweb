export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { isPublicIdForKind } from '@/lib/public-id';
import { Badge, Breadcrumbs, PageHeader } from '@property-studio/ui';
import Link from 'next/link';

export const metadata = { title: 'Property' };

type PageProps = { params: Promise<{ publicId: string }> };

export default async function PublicPropertyPage({ params }: PageProps) {
  const { publicId } = await params;
  if (!isPublicIdForKind(publicId, 'property')) {
    notFound();
  }

  let property: Awaited<ReturnType<ReturnType<typeof createServerApiClient>['getPublicProperty']>>;
  try {
    property = await createServerApiClient().getPublicProperty(publicId);
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
            items={[{ label: 'Properties', href: '/properties' }, { label: property.title }]}
          />
        }
        title={property.title}
        description={property.description ?? 'Published property details.'}
      />
      <section className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{property.publicId}</Badge>
          <Badge variant="outline">{property.propertyType.replaceAll('_', ' ')}</Badge>
          <Badge variant="outline">{property.availabilityStatus.replaceAll('_', ' ')}</Badge>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Price</dt>
            <dd className="font-medium">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: property.currency,
                maximumFractionDigits: 0,
              }).format(Number(property.priceMinor) / 100)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Configuration</dt>
            <dd className="font-medium">
              {property.configuration?.replaceAll('_', ' ') ?? 'Not published'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Bedrooms / Bathrooms</dt>
            <dd className="font-medium">
              {property.bedrooms ?? '—'} / {property.bathrooms ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Areas (sqft)</dt>
            <dd className="font-medium">
              Carpet {property.carpetAreaSqft ?? '—'} · Built-up {property.builtUpAreaSqft ?? '—'} ·
              Plot {property.plotAreaSqft ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Location</dt>
            <dd className="font-medium">
              {[property.locality, property.city, property.state].filter(Boolean).join(', ') ||
                'Not published'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Project</dt>
            <dd className="font-medium">
              {property.projectPublicId ? (
                <Link href={`/projects/${property.projectPublicId}`} className="hover:underline">
                  {property.projectPublicId}
                </Link>
              ) : (
                'Standalone listing'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Developer</dt>
            <dd className="font-medium">
              {property.developerPublicId ? (
                <Link
                  href={`/developers/${property.developerPublicId}`}
                  className="hover:underline"
                >
                  {property.developerDisplayName ?? property.developerPublicId}
                </Link>
              ) : (
                'Not published'
              )}
            </dd>
          </div>
        </dl>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Media</h2>
          <p className="text-sm text-muted-foreground">
            {property.media.length
              ? `${property.media.length} public media asset(s).`
              : 'No public media yet.'}
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">
            {property.documents.length
              ? `${property.documents.length} public document(s).`
              : 'No public documents yet.'}
          </p>
        </section>
      </section>
    </main>
  );
}
