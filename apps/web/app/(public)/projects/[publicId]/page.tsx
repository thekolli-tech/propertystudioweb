export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ApiClientError, createServerApiClient } from '@/lib/api';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@property-studio/ui';

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

  const properties = await createServerApiClient()
    .listPublicProperties({ projectPublicId: publicId, limit: 12 })
    .catch(() => ({ properties: [], nextCursor: null }));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            linkComponent={Link}
            items={[{ label: 'Projects', href: '/projects' }, { label: project.name }]}
          />
        }
        title={project.name}
        description={project.description ?? 'Published project details from the live catalog.'}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-border">
              <ImagePlaceholder className="min-h-[280px]" label="Project media" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-border">
                  <ImagePlaceholder ratio="square" label="Gallery" />
                </div>
              ))}
            </div>
          </div>

          <MapPlaceholder label="Project location map" />

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{project.publicId}</Badge>
            <Badge variant="outline">{project.projectType.replaceAll('_', ' ')}</Badge>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-4 pt-4">
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {project.description ?? 'No public description has been published for this project.'}
              </p>
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Developer</dt>
                  <dd className="font-medium">
                    {project.developerPublicId ? (
                      <Link
                        href={`/developers/${project.developerPublicId}`}
                        className="hover:underline"
                      >
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
                  <dt className="text-muted-foreground">Units</dt>
                  <dd className="font-medium">{project.totalUnits ?? 'Not published'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Total area (sqft)</dt>
                  <dd className="font-medium">{project.totalAreaSqft ?? 'Not published'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Possession</dt>
                  <dd className="font-medium">{project.possessionDate ?? 'Not published'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Published properties</dt>
                  <dd className="font-medium">{project.propertyCount}</dd>
                </div>
              </dl>
            </TabsContent>
            <TabsContent value="properties" className="pt-4">
              {properties.properties.length === 0 ? (
                <EmptyState
                  title="No published properties"
                  description="Units for this project appear when published."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {properties.properties.map((property) => (
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
            </TabsContent>
            <TabsContent value="documents" className="pt-4">
              {project.documents.length === 0 ? (
                <EmptyState
                  title="No public documents"
                  description="Brochures and approvals appear when public document metadata is linked."
                />
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {project.documents.map((doc) => (
                    <li key={doc.publicId} className="flex items-center justify-between px-4 py-3 text-sm">
                      <span className="font-medium">{doc.title}</span>
                      <Badge variant="outline">{doc.documentType}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-5 ps-card-elevated lg:sticky lg:top-24">
          <div>
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Starting price
            </p>
            <PriceDisplay
              amountMinor={project.startingPriceMinor}
              currency={project.currency}
              size="lg"
            />
          </div>
          <Button className="w-full" disabled>
            Enquire now
          </Button>
          <p className="text-xs text-muted-foreground">
            Lead capture arrives in a later phase. No fabricated enquiry counts are shown.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/properties?projectPublicId=${project.publicId}`}>View properties</Link>
          </Button>
        </aside>
      </div>
    </main>
  );
}
