export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, PropertyCard } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Studio · Properties' };

export default async function StudioPropertiesPage() {
  const cookie = await getRequestCookieHeader();
  const list = await createServerApiClient(cookie)
    .listPublicProperties({ limit: 24 })
    .catch(() => ({ properties: [], nextCursor: null }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Select a listing to open its broadcast presentation. Only published inventory is shown."
      />
      {list.properties.length === 0 ? (
        <EmptyState
          title="No properties to present"
          description="When developers publish listings, they will appear here for Broadcast Studio."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.properties.map((property) => (
            <PropertyCard
              key={property.publicId}
              linkComponent={Link}
              href={`/studio/properties/${property.publicId}`}
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
    </div>
  );
}
