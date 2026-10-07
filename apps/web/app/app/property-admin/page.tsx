import { EmptyState, PageHeader } from '@property-studio/ui';

import { PropertyAdminDashboardView } from '@/components/dashboard/role-dashboard';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Property Admin' };

export default async function PropertyAdminDashboardPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const dashboard = await client.getPropertyAdminDashboard();
    return <PropertyAdminDashboardView data={dashboard} />;
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Property Admin dashboard" description="Assignment-scoped workspace." />
        <EmptyState
          title="Unable to load assignments"
          description={
            error instanceof ApiClientError
              ? error.message
              : 'The assignment dashboard could not be reached.'
          }
        />
      </div>
    );
  }
}
