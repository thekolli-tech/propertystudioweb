export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Subscriptions' };

export default async function AdminSubscriptionsPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let plans: Awaited<ReturnType<typeof client.listSubscriptionPlans>> | null = null;
  let subscriptions: Awaited<ReturnType<typeof client.adminListSubscriptions>> | null = null;
  let unavailable = false;

  try {
    plans = await client.listSubscriptionPlans({ limit: 50 });
    subscriptions = await client.adminListSubscriptions({ limit: 50 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Platform subscription plans and organization subscriptions."
      />
      {unavailable ? (
        <EmptyState
          title="Subscriptions unavailable"
          description="Admin billing APIs could not be loaded."
        />
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Plans</h2>
            {!plans || plans.plans.length === 0 ? (
              <EmptyState
                title="No plans"
                description="Create plans through the admin API. No fabricated plan catalog is shown."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Code</th>
                      <th className="py-2 pr-3 font-medium">Name</th>
                      <th className="py-2 pr-3 font-medium">Interval</th>
                      <th className="py-2 pr-3 font-medium">Price (paise)</th>
                      <th className="py-2 font-medium">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.plans.map((plan) => (
                      <tr key={plan.publicId} className="border-b border-border/70">
                        <td className="py-2 pr-3 font-mono text-xs">{plan.code}</td>
                        <td className="py-2 pr-3">{plan.name}</td>
                        <td className="py-2 pr-3">{plan.billingInterval}</td>
                        <td className="py-2 pr-3">{plan.priceMinor}</td>
                        <td className="py-2">{plan.active ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Organization subscriptions</h2>
            {!subscriptions || subscriptions.subscriptions.length === 0 ? (
              <EmptyState
                title="No subscriptions"
                description="Organization subscription records will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[44rem] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">ID</th>
                      <th className="py-2 pr-3 font-medium">Organization</th>
                      <th className="py-2 pr-3 font-medium">Plan</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 font-medium">Period end</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.subscriptions.map((sub) => (
                      <tr key={sub.publicId} className="border-b border-border/70">
                        <td className="py-2 pr-3 font-mono text-xs">{sub.publicId}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{sub.organizationPublicId}</td>
                        <td className="py-2 pr-3">{sub.planCode}</td>
                        <td className="py-2 pr-3">{sub.status}</td>
                        <td className="py-2">
                          {new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
