export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SavePropertyButton } from '@/components/discovery/save-property-button';
import {
  IntelligencePanel,
  propertyIntelligenceToPanelProps,
} from '@/components/intelligence/intelligence-panel';
import { VerifiedBadge } from '@/components/verified-badge';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';
import { isPublicIdForKind } from '@/lib/public-id';
import {
  Badge,
  Breadcrumbs,
  Button,
  EmptyState,
  ImagePlaceholder,
  MapPlaceholder,
  PageHeader,
  PriceDisplay,
  PropertyCard,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  availabilityTone,
} from '@property-studio/ui';

export const metadata = { title: 'Property' };

type PageProps = { params: Promise<{ publicId: string }> };

export default async function PublicPropertyPage({ params }: PageProps) {
  const { publicId } = await params;
  if (!isPublicIdForKind(publicId, 'property')) {
    notFound();
  }

  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let property: Awaited<ReturnType<typeof client.getPublicProperty>>;
  try {
    property = await client.getPublicProperty(publicId);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    throw error;
  }

  const related = property.projectPublicId
    ? await client
        .listPublicProperties({ projectPublicId: property.projectPublicId, limit: 3 })
        .catch(() => ({ properties: [], nextCursor: null }))
    : { properties: [], nextCursor: null };

  let intelligence: Awaited<ReturnType<typeof client.getPropertyIntelligence>> | null = null;
  try {
    intelligence = await client.getPropertyIntelligence(publicId);
  } catch {
    intelligence = null;
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            linkComponent={Link}
            items={[{ label: 'Properties', href: '/properties' }, { label: property.title }]}
          />
        }
        title={property.title}
        description={property.description ?? 'Published property details from the live catalog.'}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
            <div className="overflow-hidden rounded-[var(--radius)] border border-border">
              <ImagePlaceholder className="min-h-[280px]" ratio="video" label="Property media" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-[var(--radius)] border border-border"
                >
                  <ImagePlaceholder
                    ratio="square"
                    label={
                      property.media[index]
                        ? (property.media[index]!.altText ?? 'Media')
                        : 'No image'
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          <MapPlaceholder label="Property location map" />

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{property.publicId}</Badge>
            <Badge variant="outline">{property.propertyType.replaceAll('_', ' ')}</Badge>
            <StatusBadge tone={availabilityTone(property.availabilityStatus)}>
              {property.availabilityStatus.replaceAll('_', ' ')}
            </StatusBadge>
            <VerifiedBadge verified={property.verifiedBadge} />
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="specs">Specifications</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="related">Related</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4 pt-4">
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {property.description ??
                  'No public description has been published for this listing.'}
              </p>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="font-medium">
                    {[property.locality, property.city, property.state]
                      .filter(Boolean)
                      .join(', ') || 'Not published'}
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
                <div>
                  <dt className="text-muted-foreground">Project</dt>
                  <dd className="font-medium">
                    {property.projectPublicId ? (
                      <Link
                        href={`/projects/${property.projectPublicId}`}
                        className="hover:underline"
                      >
                        {property.projectPublicId}
                      </Link>
                    ) : (
                      'Standalone listing'
                    )}
                  </dd>
                </div>
              </dl>
            </TabsContent>
            <TabsContent value="specs" className="pt-4">
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
                    Carpet {property.carpetAreaSqft ?? '—'} · Built-up{' '}
                    {property.builtUpAreaSqft ?? '—'} · Plot {property.plotAreaSqft ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Floor</dt>
                  <dd className="font-medium">
                    {property.floorNumber ?? '—'} / {property.totalFloors ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Facing</dt>
                  <dd className="font-medium">{property.facing ?? 'Not published'}</dd>
                </div>
              </dl>
            </TabsContent>
            <TabsContent value="documents" className="pt-4">
              {property.documents.length === 0 ? (
                <EmptyState
                  title="No public documents"
                  description="Document metadata appears here when published assets are linked."
                />
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {property.documents.map((doc) => (
                    <li
                      key={doc.publicId}
                      className="flex items-center justify-between px-4 py-3 text-sm"
                    >
                      <span className="font-medium">{doc.title}</span>
                      <Badge variant="outline">{doc.documentType}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
            <TabsContent value="related" className="pt-4">
              {related.properties.filter((item) => item.publicId !== property.publicId).length ===
              0 ? (
                <EmptyState
                  title="No related properties"
                  description="Other published units in this project will appear here."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {related.properties
                    .filter((item) => item.publicId !== property.publicId)
                    .map((item) => (
                      <PropertyCard
                        key={item.publicId}
                        linkComponent={Link}
                        href={`/properties/${item.publicId}`}
                        title={item.title}
                        publicId={item.publicId}
                        location={[item.locality, item.city].filter(Boolean).join(', ')}
                        configuration={item.configuration}
                        bedrooms={item.bedrooms}
                        priceMinor={item.priceMinor}
                        currency={item.currency}
                        availabilityStatus={item.availabilityStatus}
                      />
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {intelligence ? (
            <IntelligencePanel {...propertyIntelligenceToPanelProps(intelligence)} />
          ) : (
            <IntelligencePanel
              unavailable
              unavailableMessage="Market intelligence is not available for this locality yet."
            />
          )}
        </div>

        <aside className="h-fit space-y-4 rounded-[var(--radius)] border border-border bg-card p-5 ps-card-elevated lg:sticky lg:top-20">
          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Price
            </p>
            <PriceDisplay
              amountMinor={property.priceMinor}
              currency={property.currency}
              size="lg"
            />
          </div>
          <StatusBadge tone={availabilityTone(property.availabilityStatus)}>
            {property.availabilityStatus.replaceAll('_', ' ')}
          </StatusBadge>
          <Button className="w-full" disabled>
            Enquire now
          </Button>
          <SavePropertyButton propertyPublicId={property.publicId} />
          <p className="text-xs text-muted-foreground">
            Enquiry workflows ship in a later phase. This CTA is visual-only until lead APIs exist.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/requirements">Post a requirement instead</Link>
          </Button>
        </aside>
      </div>
    </main>
  );
}
