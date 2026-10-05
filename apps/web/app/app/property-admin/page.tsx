import Link from 'next/link';
import { ClipboardList, FolderKanban, Home } from 'lucide-react';
import {
  Button,
  DashboardSection,
  EmptyState,
  PageHeader,
  PropertyCard,
  StatCard,
  StatusBadge,
  availabilityTone,
} from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Property Admin' };

export default async function PropertyAdminDashboardPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let properties: Awaited<ReturnType<typeof client.listProperties>>['properties'] = [];
  let loadError: string | null = null;

  try {
    // Without organizationPublicId, PROPERTY_ADMIN receives only assigned properties.
    properties = (await client.listProperties({ limit: 24 })).properties;
  } catch (error) {
    if (error instanceof ApiClientError) {
      loadError = error.message;
    } else {
      throw error;
    }
  }

  const available = properties.filter((item) => item.availabilityStatus === 'AVAILABLE').length;
  const underOffer = properties.filter((item) => item.availabilityStatus === 'UNDER_OFFER').length;
  const sold = properties.filter((item) => item.availabilityStatus === 'SOLD').length;
  const projectIds = new Set(
    properties.map((item) => item.projectPublicId).filter((value): value is string => Boolean(value)),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Property Admin dashboard"
        description="Assignment-scoped workspace. You only see resources explicitly assigned to your account."
      />

      {loadError ? (
        <EmptyState
          title="Unable to load assignments"
          description="The assignment API could not be reached. Try again shortly."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Assigned properties"
              value={properties.length}
              hint="From GET /api/v1/properties with PROPERTY_ADMIN assignment scope."
              icon={<Home className="h-4 w-4" />}
            />
            <StatCard
              label="Related projects"
              value={projectIds.size}
              hint="Derived from assigned property project links — not a separate assignment API."
              icon={<FolderKanban className="h-4 w-4" />}
            />
            <StatCard
              label="Available"
              value={available}
              hint={`${underOffer} under offer · ${sold} sold`}
              icon={<ClipboardList className="h-4 w-4" />}
            />
            <StatCard
              label="Construction updates"
              value={null}
              unavailable
              hint="Construction update APIs are not available yet."
            />
          </div>

          <DashboardSection
            title="Assigned properties"
            description="Live assignment list. Empty means nothing has been assigned yet."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/app/property-admin/properties">View all</Link>
              </Button>
            }
          >
            {properties.length === 0 ? (
              <EmptyState
                title="No assigned properties"
                description="A Super Admin must create resource assignments before properties appear here."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {properties.slice(0, 6).map((property) => (
                  <PropertyCard
                    key={property.publicId}
                    linkComponent={Link}
                    href={`/app/property-admin/properties`}
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
          </DashboardSection>

          <DashboardSection title="Inventory summary" description="Availability mix of assigned stock.">
            {properties.length === 0 ? (
              <EmptyState
                title="No inventory to summarize"
                description="Inventory counts appear after properties are assigned."
              />
            ) : (
              <div className="flex flex-wrap gap-3">
                <StatusBadge tone="success">Available · {available}</StatusBadge>
                <StatusBadge tone="warning">Under offer · {underOffer}</StatusBadge>
                <StatusBadge tone="danger">Sold · {sold}</StatusBadge>
                <StatusBadge tone={availabilityTone('UNAVAILABLE')}>
                  Unavailable ·{' '}
                  {properties.filter((item) => item.availabilityStatus === 'UNAVAILABLE').length}
                </StatusBadge>
              </div>
            )}
          </DashboardSection>

          <DashboardSection
            title="Recent construction updates"
            description="Update feeds require a dedicated backend module."
          >
            <EmptyState
              title="No construction updates yet"
              description="Construction update APIs are not shipped in this phase."
            />
          </DashboardSection>
        </>
      )}
    </div>
  );
}
