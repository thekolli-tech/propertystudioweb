export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Users' };

export default async function AdminUsersPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const data = await client.getAdminControlCenter({ period: 'DAYS_30' });
    return (
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description="Aggregate user counts by persona and platform role. Role grants remain on the users API."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {[data.users.total, data.users.newInPeriod, data.users.activeUsers].map((metric) => (
            <div key={metric.key} className="rounded-[var(--radius)] border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
                <StatusBadge tone={metric.coverageState === 'READY' ? 'success' : 'neutral'}>
                  {metric.coverageState}
                </StatusBadge>
              </div>
              <p className="mt-2 font-display text-2xl font-semibold">
                {metric.coverageState === 'UNAVAILABLE' ? '—' : (metric.value ?? '—')}
              </p>
              {metric.note ? (
                <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
              ) : null}
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-2">
            <h2 className="text-base font-semibold">Personas</h2>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {data.users.byPersona.map((row) => (
                <li key={row.key} className="flex justify-between px-3 py-2 text-sm">
                  <span>{row.label}</span>
                  <Badge variant="outline">{row.count}</Badge>
                </li>
              ))}
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="text-base font-semibold">Platform roles</h2>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {data.users.byPlatformRole.map((row) => (
                <li key={row.key} className="flex justify-between px-3 py-2 text-sm">
                  <span>{row.label}</span>
                  <Badge variant="outline">{row.count}</Badge>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className="text-sm text-muted-foreground">
          Grant platform roles via{' '}
          <code className="font-mono text-xs">
            POST /api/v1/admin/users/:publicId/platform-roles
          </code>
          . See also{' '}
          <Link className="underline" href="/admin/overview">
            control center
          </Link>
          .
        </p>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users" description="Platform user aggregates." />
        <EmptyState
          title="User analytics unavailable"
          description={
            error instanceof ApiClientError ? error.message : 'Could not load user analytics.'
          }
        />
      </div>
    );
  }
}
