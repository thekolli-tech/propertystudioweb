import Link from 'next/link';
import {
  EmptyState,
  PageHeader,
  PropertyCard,
  StatusBadge,
} from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Assigned properties' };

export default async function PropertyAdminPropertiesPage() {
  const cookie = await getRequestCookieHeader();
  let properties: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['listProperties']>
  >['properties'] = [];
  let errorMessage: string | null = null;

  try {
    properties = (await createServerApiClient(cookie).listProperties({ limit: 50 })).properties;
  } catch (error) {
    if (error instanceof ApiClientError) {
      errorMessage = error.message;
    } else {
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assigned properties"
        description="Only properties with an active resource assignment for your account."
      />
      {errorMessage ? (
        <EmptyState title="Unable to load properties" description="Try again shortly." />
      ) : properties.length === 0 ? (
        <EmptyState
          title="No assigned properties"
          description="Nothing is assigned yet. Contact a Super Admin if you expected inventory here."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone="info">{properties.length} assigned</StatusBadge>
            <StatusBadge tone="success">
              {properties.filter((item) => item.availabilityStatus === 'AVAILABLE').length} available
            </StatusBadge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
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
        </div>
      )}
    </div>
  );
}
