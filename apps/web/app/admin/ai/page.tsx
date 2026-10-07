export const dynamic = 'force-dynamic';

import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'AI governance' };

export default async function AdminAiPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const data = await client.getAdminAiGovernance();
    const metrics = [
      data.conversations,
      data.activeConversations,
      data.messages,
      data.toolInvocations,
      data.unavailableAssistantReplies,
    ];

    return (
      <div className="space-y-8">
        <PageHeader
          title="AI governance"
          description="Telemetry only — private conversation content is not exposed by default."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{data.providerName}</Badge>
          <StatusBadge tone={data.providerStatus === 'CONFIGURED' ? 'success' : 'warning'}>
            {data.providerStatus}
          </StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">{data.note}</p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.key}
              className="space-y-2 rounded-[var(--radius)] border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  {metric.label}
                </p>
                <StatusBadge tone={metric.coverageState === 'READY' ? 'success' : 'neutral'}>
                  {metric.coverageState}
                </StatusBadge>
              </div>
              <p className="font-display text-2xl font-semibold">{metric.value ?? '—'}</p>
            </div>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Analytics events by type</h2>
          {data.analyticsByType.length === 0 ? (
            <EmptyState
              title="Insufficient data"
              description="No AI analytics events recorded yet."
            />
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {data.analyticsByType.map((row) => (
                <li key={row.key} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>{row.label}</span>
                  <Badge variant="outline">{row.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="AI governance" description="Authorized AI telemetry only." />
        <EmptyState
          title="AI governance unavailable"
          description={
            error instanceof ApiClientError ? error.message : 'Could not load AI governance.'
          }
        />
      </div>
    );
  }
}
