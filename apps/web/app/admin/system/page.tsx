export const dynamic = 'force-dynamic';

import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'System health' };

function toneFor(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'HEALTHY') return 'success';
  if (status === 'DEGRADED') return 'warning';
  if (status === 'UNAVAILABLE') return 'danger';
  return 'neutral';
}

export default async function AdminSystemPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const health = await client.getAdminSystemHealth();
    return (
      <div className="space-y-8">
        <PageHeader
          title="System health"
          description="Read-only observability. No infrastructure mutations are available from this surface."
        />
        <div className="flex items-center gap-3">
          <StatusBadge tone={toneFor(health.overall)}>Overall · {health.overall}</StatusBadge>
          <p className="text-xs text-muted-foreground">
            Checked{' '}
            {new Date(health.checkedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Components</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {health.components.map((component) => (
              <li
                key={component.key}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{component.label}</p>
                  {component.detail ? (
                    <p className="text-xs text-muted-foreground">{component.detail}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {component.latencyMs != null ? (
                    <Badge variant="outline">{component.latencyMs} ms</Badge>
                  ) : null}
                  <StatusBadge tone={toneFor(component.status)}>{component.status}</StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Configured providers</h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {health.providers.map((provider) => (
              <li
                key={provider.key}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{provider.label}</p>
                  <p className="text-xs text-muted-foreground">{provider.mode ?? '—'}</p>
                </div>
                <StatusBadge tone={provider.configured ? 'success' : 'warning'}>
                  {provider.configured ? 'CONFIGURED' : 'NOT CONFIGURED'}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="System health" description="Read-only infrastructure status." />
        <EmptyState
          title="System health unavailable"
          description={
            error instanceof ApiClientError ? error.message : 'Could not load system health.'
          }
        />
      </div>
    );
  }
}
