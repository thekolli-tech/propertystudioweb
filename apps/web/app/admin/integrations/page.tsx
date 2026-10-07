export const dynamic = 'force-dynamic';

import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin · Integrations' };

export default async function AdminIntegrationsPage() {
  const cookie = await getRequestCookieHeader();
  let unavailable = false;
  let overview: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['getAdminIntegrationsOverview']>
  > | null = null;
  let deadLetters: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['listDeadLetterEvents']>
  > | null = null;

  try {
    const client = createServerApiClient(cookie);
    overview = await client.getAdminIntegrationsOverview();
    deadLetters = await client.listDeadLetterEvents();
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integrations"
        description="Partner integrations, API clients, webhooks, and dead-letter deliveries. Secrets are never shown after creation."
      />

      {unavailable || !overview ? (
        <EmptyState
          title="Integrations unavailable"
          description="Admin integrations API could not be loaded for this session."
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Partner integrations</h2>
            {overview.integrations.length === 0 ? (
              <EmptyState
                title="No partner integrations"
                description="Create a partner integration for an organization to enable API keys and webhooks."
              />
            ) : (
              <ul className="space-y-2">
                {overview.integrations.map((item) => (
                  <li
                    key={item.publicId}
                    className="flex flex-wrap items-center gap-2 border-b border-border py-3"
                  >
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="outline">{item.integrationType}</Badge>
                    <StatusBadge
                      tone={
                        item.status === 'ACTIVE'
                          ? 'success'
                          : item.status === 'SUSPENDED'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {item.status}
                    </StatusBadge>
                    <StatusBadge tone="neutral">{item.healthStatus}</StatusBadge>
                    <span className="text-sm text-muted-foreground">{item.publicId}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">API clients</h2>
            {overview.apiClients.length === 0 ? (
              <EmptyState
                title="No API clients"
                description="API clients appear after an organization creates scoped keys."
              />
            ) : (
              <ul className="space-y-2">
                {overview.apiClients.map((client) => (
                  <li
                    key={client.publicId}
                    className="flex flex-wrap items-center gap-2 border-b border-border py-3"
                  >
                    <span className="font-medium">{client.name}</span>
                    <Badge variant="outline">{client.keyPrefix}…</Badge>
                    <StatusBadge tone={client.status === 'ACTIVE' ? 'success' : 'danger'}>
                      {client.status}
                    </StatusBadge>
                    <span className="text-sm text-muted-foreground">
                      {client.scopes.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Webhook endpoints</h2>
            {overview.webhooks.length === 0 ? (
              <EmptyState
                title="No webhook endpoints"
                description="Outbound webhook endpoints will list here when configured."
              />
            ) : (
              <ul className="space-y-2">
                {overview.webhooks.map((hook) => (
                  <li key={hook.publicId} className="border-b border-border py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{hook.url}</span>
                      <StatusBadge tone={hook.status === 'ACTIVE' ? 'success' : 'warning'}>
                        {hook.status}
                      </StatusBadge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {hook.subscribedEvents.join(', ')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Notification providers</h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {overview.notificationProviders.map((provider) => (
                <li key={provider.kind} className="border border-border p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{provider.kind}</Badge>
                    <StatusBadge
                      tone={provider.status === 'CONFIGURED' ? 'success' : 'neutral'}
                    >
                      {provider.status}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{provider.message}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Failed deliveries</h2>
            {overview.failedDeliveries.length === 0 ? (
              <EmptyState
                title="No failed deliveries"
                description="Failed and dead-lettered webhook deliveries will appear here."
              />
            ) : (
              <ul className="space-y-2">
                {overview.failedDeliveries.map((delivery) => (
                  <li key={delivery.publicId} className="border-b border-border py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <span className="font-medium">{delivery.eventType}</span>
                      <StatusBadge tone="danger">{delivery.status}</StatusBadge>
                      <span className="text-muted-foreground">
                        attempts {delivery.attemptCount}
                      </span>
                    </div>
                    {delivery.lastError ? (
                      <p className="mt-1 text-muted-foreground">{delivery.lastError}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Dead letters</h2>
            {!deadLetters || deadLetters.items.length === 0 ? (
              <EmptyState
                title="No dead-letter events"
                description="Permanently failed jobs and webhook deliveries are retained here for admin retry."
              />
            ) : (
              <ul className="space-y-2">
                {deadLetters.items.map((item) => (
                  <li key={item.publicId} className="border-b border-border py-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{item.sourceType}</Badge>
                      <StatusBadge tone={item.status === 'OPEN' ? 'danger' : 'neutral'}>
                        {item.status}
                      </StatusBadge>
                      <span className="text-muted-foreground">{item.publicId}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{item.failureReason}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
