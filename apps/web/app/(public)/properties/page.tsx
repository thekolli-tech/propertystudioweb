export const dynamic = 'force-dynamic';

import { createServerApiClient } from '@/lib/api';
import { Badge, EmptyState, PageHeader } from '@property-studio/ui';
import Link from 'next/link';

export const metadata = { title: 'Properties' };

export default async function PropertiesPage() {
  const list = await createServerApiClient().listPublicProperties({ limit: 24 });

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Properties"
        description="Published property listings available for discovery."
      />
      {list.properties.length === 0 ? (
        <EmptyState
          title="No published properties yet"
          description="Listings appear here after a developer organization publishes them."
        />
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {list.properties.map((property) => (
            <li key={property.publicId} className="py-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <div className="space-y-1">
                  <Link
                    href={`/properties/${property.publicId}`}
                    className="text-lg font-semibold text-foreground hover:underline"
                  >
                    {property.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: property.currency,
                      maximumFractionDigits: 0,
                    }).format(Number(property.priceMinor) / 100)}
                    {property.city ? ` · ${property.city}` : ''}
                    {property.developerDisplayName ? ` · ${property.developerDisplayName}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{property.publicId}</Badge>
                  <Badge variant="outline">
                    {property.availabilityStatus.replaceAll('_', ' ')}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
