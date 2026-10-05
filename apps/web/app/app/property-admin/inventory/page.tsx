import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Inventory' };

export default async function PropertyAdminInventoryPage() {
  const cookie = await getRequestCookieHeader();
  let properties: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['listProperties']>
  >['properties'] = [];

  try {
    properties = (await createServerApiClient(cookie).listProperties({ limit: 100 })).properties;
  } catch (error) {
    if (!(error instanceof ApiClientError)) throw error;
  }

  const byStatus = {
    AVAILABLE: properties.filter((item) => item.availabilityStatus === 'AVAILABLE').length,
    UNDER_OFFER: properties.filter((item) => item.availabilityStatus === 'UNDER_OFFER').length,
    SOLD: properties.filter((item) => item.availabilityStatus === 'SOLD').length,
    UNAVAILABLE: properties.filter((item) => item.availabilityStatus === 'UNAVAILABLE').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Availability summary for properties assigned to you."
      />
      {properties.length === 0 ? (
        <EmptyState
          title="No inventory"
          description="Assigned stock will summarize here once resource assignments exist."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['AVAILABLE', 'success', byStatus.AVAILABLE],
              ['UNDER_OFFER', 'warning', byStatus.UNDER_OFFER],
              ['SOLD', 'info', byStatus.SOLD],
              ['UNAVAILABLE', 'danger', byStatus.UNAVAILABLE],
            ] as const
          ).map(([label, tone, count]) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-card p-5 ps-card-elevated"
            >
              <StatusBadge tone={tone}>{label.replaceAll('_', ' ')}</StatusBadge>
              <p className="mt-4 font-display text-3xl font-semibold">{count}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
