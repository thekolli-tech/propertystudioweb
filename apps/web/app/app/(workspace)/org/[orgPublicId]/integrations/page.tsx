export const dynamic = 'force-dynamic';

import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Integrations' };

type PageProps = {
  params: Promise<{ orgPublicId: string }>;
};

export default async function OrgIntegrationsPage({ params }: PageProps) {
  const { orgPublicId } = await params;
  const cookie = await getRequestCookieHeader();
  let unavailable = false;
  let overview: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['getOrgIntegrationsOverview']>
  > | null = null;

  try {
    overview = await createServerApiClient(cookie).getOrgIntegrationsOverview(orgPublicId);
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integrations"
        description="API clients, webhooks, and delivery health for this organization. Raw secrets are never displayed."
      />

      {unavailable || !overview ? (
        <EmptyState
          title="Integrations unavailable"
          description="Integrations could not be loaded for this organization session."
        />
      ) : overview.integrations.length === 0 ? (
        <EmptyState
          title="No integrations yet"
          description="Connect a partner integration to issue API keys and subscribe to webhooks."
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Connected</h2>
            <ul className="space-y-2">
              {overview.integrations.map((item) => (
                <li
                  key={item.publicId}
                  className="flex flex-wrap items-center gap-2 border-b border-border py-3"
                >
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="outline">{item.integrationType}</Badge>
                  <StatusBadge tone={item.status === 'ACTIVE' ? 'success' : 'warning'}>
                    {item.status}
                  </StatusBadge>
                  <StatusBadge tone="neutral">{item.healthStatus}</StatusBadge>
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">API clients</h2>
            {overview.apiClients.length === 0 ? (
              <EmptyState
                title="No API clients"
                description="Create a scoped API client to access the Partner API."
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
                    <span className="text-sm text-muted-foreground">
                      {client.scopes.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Webhooks</h2>
            {overview.webhooks.length === 0 ? (
              <EmptyState
                title="No webhooks"
                description="Subscribe to domain events with signed outbound webhooks."
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
            <h2 className="font-display text-lg font-semibold">Recent failures</h2>
            {overview.failedDeliveries.length === 0 ? (
              <EmptyState
                title="No recent failures"
                description="Failed webhook deliveries for this organization will show here."
              />
            ) : (
              <ul className="space-y-2">
                {overview.failedDeliveries.map((delivery) => (
                  <li key={delivery.publicId} className="border-b border-border py-3 text-sm">
                    <span className="font-medium">{delivery.eventType}</span>
                    <span className="ml-2 text-muted-foreground">{delivery.status}</span>
                    {delivery.lastError ? (
                      <p className="mt-1 text-muted-foreground">{delivery.lastError}</p>
                    ) : null}
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
