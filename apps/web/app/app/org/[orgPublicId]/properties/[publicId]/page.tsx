export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, requireSessionUser } from '@/lib/auth';
import { isPublicIdForKind } from '@/lib/public-id';
import { Badge, Breadcrumbs, ErrorState, PageHeader } from '@property-studio/ui';
import Link from 'next/link';

export const metadata = { title: 'Property' };

type PageProps = {
  params: Promise<{ orgPublicId: string; publicId: string }>;
};

export default async function OrganizationPropertyDetailPage({ params }: PageProps) {
  const { orgPublicId, publicId } = await params;
  if (!isPublicIdForKind(orgPublicId, 'organization') || !isPublicIdForKind(publicId, 'property')) {
    notFound();
  }

  await requireSessionUser();
  const client = createServerApiClient(await getRequestCookieHeader());

  try {
    const property = await client.getProperty(publicId);
    if (property.organizationPublicId !== orgPublicId) {
      notFound();
    }

    return (
      <div className="space-y-6">
        <PageHeader
          breadcrumbs={
            <Breadcrumbs
              linkComponent={Link}
              items={[
                { label: 'Properties', href: `/app/org/${orgPublicId}/properties` },
                { label: property.title },
              ]}
            />
          }
          title={property.title}
          description={property.description ?? 'Property details for your developer catalog.'}
        />
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{property.publicId}</Badge>
          <Badge variant="outline">{property.publicationStatus}</Badge>
          <Badge variant="outline">{property.availabilityStatus}</Badge>
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
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium">{property.propertyType.replaceAll('_', ' ')}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Configuration</dt>
            <dd className="font-medium">
              {property.configuration?.replaceAll('_', ' ') ?? 'Not set'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Project</dt>
            <dd className="font-medium">{property.projectPublicId ?? 'Standalone'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Bedrooms / Bathrooms</dt>
            <dd className="font-medium">
              {property.bedrooms ?? '—'} / {property.bathrooms ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Location</dt>
            <dd className="font-medium">
              {[property.locality, property.city, property.state].filter(Boolean).join(', ') ||
                'Not set'}
            </dd>
          </div>
        </dl>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Media foundation</h2>
          <p className="text-sm text-muted-foreground">
            {property.media.length
              ? `${property.media.length} media asset(s) linked.`
              : 'No media assets linked yet.'}
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Document foundation</h2>
          <p className="text-sm text-muted-foreground">
            {property.documents.length
              ? `${property.documents.length} document(s) linked.`
              : 'No documents linked yet.'}
          </p>
        </section>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    if (error instanceof ApiClientError) {
      return <ErrorState title="Unable to load property" message={error.message} />;
    }
    throw error;
  }
}
