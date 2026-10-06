export const dynamic = 'force-dynamic';

import { DashboardSection, EmptyState, PageHeader } from '@property-studio/ui';

import { BillingSubnav } from '@/components/billing/billing-subnav';
import { SubscribePlanForm } from '@/components/billing/subscribe-plan-form';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Plans' };

function formatInr(minor: string): string {
  const value = Number(minor) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export default async function OrganizationPlansPage({
  params,
}: {
  params: Promise<{ orgPublicId: string }>;
}) {
  const { orgPublicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let plans: Awaited<ReturnType<typeof client.listSubscriptionPlans>> | null = null;
  let current: Awaited<ReturnType<typeof client.getCurrentSubscription>> | null = null;
  let unavailable = false;

  try {
    plans = await client.listSubscriptionPlans({ limit: 50, active: true });
    current = await client.getCurrentSubscription(orgPublicId);
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        description="Subscription plans loaded from the API. Entitlements are enforced server-side."
      />
      <BillingSubnav orgPublicId={orgPublicId} />

      {unavailable || !plans ? (
        <EmptyState
          title="Plans unavailable"
          description="Subscription plans could not be loaded."
        />
      ) : plans.plans.length === 0 ? (
        <EmptyState
          title="No plans published"
          description="Platform administrators can create subscription plans. No fabricated plans are shown."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.plans.map((plan) => {
            const isCurrent = current?.planPublicId === plan.publicId;
            return (
              <DashboardSection
                key={plan.publicId}
                title={plan.name}
                description={plan.description ?? `${plan.billingInterval} · ${plan.code}`}
              >
                <div className="space-y-3 text-sm">
                  <p className="text-2xl font-semibold tracking-tight">
                    {formatInr(plan.priceMinor)}
                  </p>
                  <p className="text-muted-foreground">
                    Includes {formatInr(plan.includedCredits)} credits · lead purchase{' '}
                    {formatInr(plan.leadPurchasePriceMinor)}
                  </p>
                  <p className="text-muted-foreground">
                    Entitlements:{' '}
                    {plan.entitlements.length > 0 ? plan.entitlements.join(', ') : 'None'}
                  </p>
                  {isCurrent ? (
                    <p className="font-medium text-foreground">Current plan</p>
                  ) : (
                    <SubscribePlanForm orgPublicId={orgPublicId} planPublicId={plan.publicId} />
                  )}
                </div>
              </DashboardSection>
            );
          })}
        </div>
      )}
    </div>
  );
}
