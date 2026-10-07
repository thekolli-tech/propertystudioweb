import { EmptyState, PageHeader } from '@property-studio/ui';

import { AdminDashboardView } from '@/components/dashboard/role-dashboard';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin dashboard' };

export default async function AdminHomePage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const dashboard = await client.getAdminDashboard();
    return <AdminDashboardView data={dashboard} />;
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Platform overview"
          description="Super Admin console. Metrics only appear when backed by live APIs."
        />
        <EmptyState
          title="Admin dashboard unavailable"
          description={
            error instanceof ApiClientError ? error.message : 'Could not load platform aggregates.'
          }
        />
      </div>
    );
  }
}
