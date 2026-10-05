export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import Link from 'next/link';
import { EmptyState, PageHeader, PropertyCard, Skeleton } from '@property-studio/ui';

import { PropertyFilterBar } from '@/components/public/property-filter-bar';
import { createServerApiClient } from '@/lib/api';

export const metadata = { title: 'Properties' };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = {
    city: first(params.city),
    locality: first(params.locality),
    propertyType: first(params.propertyType) as
      | 'APARTMENT'
      | 'VILLA'
      | 'PLOT'
      | 'OFFICE'
      | 'SHOP'
      | 'WAREHOUSE'
      | 'OTHER'
      | undefined,
    configuration: first(params.configuration) as
      | 'STUDIO'
      | 'ONE_BHK'
      | 'TWO_BHK'
      | 'THREE_BHK'
      | 'FOUR_BHK'
      | 'FIVE_BHK_PLUS'
      | 'OTHER'
      | undefined,
    bedrooms: first(params.bedrooms) ? Number(first(params.bedrooms)) : undefined,
    maxPriceMinor: first(params.maxPriceMinor) ? BigInt(first(params.maxPriceMinor)!) : undefined,
    availabilityStatus: first(params.availabilityStatus) as
      | 'AVAILABLE'
      | 'UNDER_OFFER'
      | 'SOLD'
      | 'UNAVAILABLE'
      | undefined,
    limit: 24,
  };

  const list = await createServerApiClient()
    .listPublicProperties(query)
    .catch(() => ({ properties: [], nextCursor: null }));

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Properties"
        description="Discover published listings with live filters. Empty catalogs stay empty — no fabricated inventory."
      />
      <Suspense fallback={<Skeleton className="h-40 w-full rounded-xl" />}>
        <PropertyFilterBar />
      </Suspense>
      {list.properties.length === 0 ? (
        <EmptyState
          title="No properties found"
          description="Try adjusting filters, or check back when developers publish listings."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.properties.map((property) => (
            <PropertyCard
              key={property.publicId}
              linkComponent={Link}
              href={`/properties/${property.publicId}`}
              title={property.title}
              publicId={property.publicId}
              location={[property.locality, property.city].filter(Boolean).join(', ')}
              projectLabel={property.projectPublicId}
              configuration={property.configuration}
              bedrooms={property.bedrooms}
              priceMinor={property.priceMinor}
              currency={property.currency}
              availabilityStatus={property.availabilityStatus}
            />
          ))}
        </div>
      )}
    </main>
  );
}
