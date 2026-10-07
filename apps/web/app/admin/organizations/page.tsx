export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Organizations' };

export default async function AdminOrganizationsPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const data = await client.getAdminControlCenter({ period: 'DAYS_30' });
    const metrics = [
      data.organizations.total,
      data.organizations.developers,
      data.organizations.agencies,
      data.organizations.pendingVerification,
    ];
    return (
      <div className="space-y-6">
        <PageHeader
          title="Organizations"
          description="Developer and agency organization aggregates from live profiles."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Link
              key={metric.key}
              href={metric.href ?? '/admin/organizations'}
              className="rounded-[var(--radius)] border border-border p-4 transition hover:opacity-90"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
                <StatusBadge tone={metric.coverageState === 'READY' ? 'success' : 'neutral'}>
                  {metric.coverageState}
                </StatusBadge>
              </div>
              <p className="mt-2 font-display text-2xl font-semibold">{metric.value ?? '—'}</p>
            </Link>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Verification queue:{' '}
          <Link className="underline" href="/admin/verification">
            /admin/verification
          </Link>
        </p>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Organizations" description="Organization aggregates." />
        <EmptyState
          title="Organization analytics unavailable"
          description={
            error instanceof ApiClientError
              ? error.message
              : 'Could not load organization analytics.'
          }
        />
      </div>
    );
  }
}
