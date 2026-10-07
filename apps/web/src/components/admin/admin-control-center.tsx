'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type {
  AdminControlCenterResponse,
  AdminControlMetric,
  AdminAnalyticsPeriod,
} from '@property-studio/contracts';
import {
  Badge,
  Button,
  DashboardSection,
  EmptyState,
  PageHeader,
  StatusBadge,
} from '@property-studio/ui';

import {
  ActivityFeed,
  AttentionItems,
  QuickActions,
} from '@/components/dashboard/dashboard-primitives';

const PERIODS: Array<{ id: AdminAnalyticsPeriod; label: string }> = [
  { id: 'TODAY', label: 'Today' },
  { id: 'DAYS_7', label: '7 days' },
  { id: 'DAYS_30', label: '30 days' },
  { id: 'DAYS_90', label: '90 days' },
];

function formatMoneyMinor(value: string | number | null | undefined, currency = 'INR'): string {
  if (value == null) return '—';
  const major = Number(value) / 100;
  if (!Number.isFinite(major)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(major);
}

function MetricCell({ metric }: { metric: AdminControlMetric }) {
  const display =
    metric.coverageState === 'UNAVAILABLE'
      ? 'Unavailable'
      : metric.unit === 'money_minor'
        ? formatMoneyMinor(metric.value, metric.currency ?? 'INR')
        : metric.value == null
          ? '—'
          : String(metric.value);

  const tone =
    metric.coverageState === 'UNAVAILABLE'
      ? 'neutral'
      : metric.coverageState === 'ZERO'
        ? 'neutral'
        : 'success';

  const body = (
    <div className="space-y-2 rounded-[var(--radius)] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
          {metric.label}
        </p>
        <StatusBadge tone={tone}>{metric.coverageState}</StatusBadge>
      </div>
      <p className="font-display text-2xl font-semibold tracking-tight">{display}</p>
      {metric.note ? <p className="text-xs text-muted-foreground">{metric.note}</p> : null}
    </div>
  );

  if (metric.href) {
    return (
      <Link href={metric.href} className="block transition hover:opacity-90">
        {body}
      </Link>
    );
  }
  return body;
}

function MetricGrid({ metrics }: { metrics: AdminControlMetric[] }) {
  if (metrics.length === 0) {
    return <EmptyState title="Insufficient data" description="No metrics in this section." />;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((m) => (
        <MetricCell key={m.key} metric={m} />
      ))}
    </div>
  );
}

function CountList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; label: string; count: number }>;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Insufficient data</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{row.label}</span>
              <Badge variant="outline">{row.count}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminControlCenter({ data }: { data: AdminControlCenterResponse }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activePeriod = (searchParams.get('period') as AdminAnalyticsPeriod | null) ?? data.period;

  function setPeriod(period: AdminAnalyticsPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', period);
    router.push(`/admin/overview?${params.toString()}`);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Control Center"
        description={`Live platform aggregates · ${data.timezone} · ${new Date(data.rangeStart).toLocaleString('en-IN', { timeZone: data.timezone })} → ${new Date(data.rangeEnd).toLocaleString('en-IN', { timeZone: data.timezone })}`}
      />

      <div className="flex flex-wrap gap-2">
        {PERIODS.map((period) => (
          <Button
            key={period.id}
            type="button"
            size="sm"
            variant={activePeriod === period.id ? 'default' : 'outline'}
            onClick={() => setPeriod(period.id)}
          >
            {period.label}
          </Button>
        ))}
      </div>

      <DashboardSection title="Attention queues">
        <AttentionItems items={data.attentionItems} />
      </DashboardSection>

      <DashboardSection title="Users">
        <MetricGrid metrics={[data.users.total, data.users.newInPeriod, data.users.activeUsers]} />
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <CountList title="By persona" rows={data.users.byPersona} />
          <CountList title="By platform role" rows={data.users.byPlatformRole} />
        </div>
      </DashboardSection>

      <DashboardSection title="Organizations">
        <MetricGrid
          metrics={[
            data.organizations.total,
            data.organizations.developers,
            data.organizations.agencies,
            data.organizations.pendingVerification,
          ]}
        />
      </DashboardSection>

      <DashboardSection title="Catalog">
        <MetricGrid
          metrics={[
            data.catalog.projects,
            data.catalog.properties,
            data.catalog.publishedProperties,
            data.catalog.draftProperties,
            data.catalog.communities,
            data.catalog.mediaAssets,
          ]}
        />
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <CountList title="Projects by status" rows={data.catalog.projectsByStatus} />
          <CountList title="Properties by status" rows={data.catalog.propertiesByStatus} />
          <CountList title="Published by city" rows={data.catalog.propertiesByCity} />
        </div>
      </DashboardSection>

      <DashboardSection title="Demand marketplace">
        <MetricGrid
          metrics={[
            data.demand.requirements,
            data.demand.activeRequirements,
            data.demand.marketplaceRequirements,
            data.demand.leads,
            data.demand.leadsCreatedInPeriod,
          ]}
        />
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <CountList title="Lead lifecycle" rows={data.demand.leadLifecycle} />
          <CountList title="Requirements by type" rows={data.demand.requirementsByPropertyType} />
          <CountList title="Requirements by city" rows={data.demand.requirementsByCity} />
        </div>
      </DashboardSection>

      <DashboardSection
        title="Business funnel"
        description="Period counts where events exist; stock stages labeled as current inventory when transition history is unavailable."
      >
        <ol className="space-y-2">
          {data.funnel.map((step) => (
            <li
              key={step.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{step.label}</p>
                {step.note ? <p className="text-xs text-muted-foreground">{step.note}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  tone={
                    step.coverageState === 'READY'
                      ? 'success'
                      : step.coverageState === 'ZERO'
                        ? 'neutral'
                        : 'warning'
                  }
                >
                  {step.coverageState}
                </StatusBadge>
                <span className="font-mono">
                  {step.coverageState === 'UNAVAILABLE' ? '—' : step.count}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </DashboardSection>

      <div className="grid gap-8 lg:grid-cols-2">
        <DashboardSection title="CRM">
          <MetricGrid
            metrics={[
              data.crm.contacts,
              data.crm.openFollowUps,
              data.crm.scheduledSiteVisits,
              data.crm.openDeals,
              data.crm.closedDeals,
            ]}
          />
        </DashboardSection>
        <DashboardSection title="Trust">
          <MetricGrid
            metrics={[
              data.trust.pendingVerificationCases,
              data.trust.verifiedDevelopers,
              data.trust.verifiedAgents,
              data.trust.publishedReviews,
              data.trust.openReviewReports,
              data.trust.openContentReports,
            ]}
          />
        </DashboardSection>
      </div>

      <DashboardSection title="Money">
        <MetricGrid
          metrics={[
            data.money.activeSubscriptions,
            data.money.paymentVolumeCapturedMinor,
            data.money.walletBalancesMinor,
            data.money.leadPurchasesInPeriod,
            data.money.refundsInPeriod,
            data.money.failedPaymentsInPeriod,
          ]}
        />
        <div className="mt-4">
          <CountList title="Subscriptions by status" rows={data.money.subscriptionsByStatus} />
        </div>
      </DashboardSection>

      <div className="grid gap-8 lg:grid-cols-2">
        <DashboardSection title="Media">
          <MetricGrid
            metrics={[
              data.media.publishedMedia,
              data.media.pendingModeration,
              data.media.analyticsEventsInPeriod,
            ]}
          />
        </DashboardSection>
        <DashboardSection title="Integrations">
          <MetricGrid
            metrics={[
              data.integrations.activeApiClients,
              data.integrations.activeWebhookEndpoints,
              data.integrations.failedWebhookDeliveries,
              data.integrations.openDeadLetters,
              data.integrations.failedBackgroundJobs,
            ]}
          />
        </DashboardSection>
      </div>

      <DashboardSection title="AI governance">
        <p className="mb-3 text-sm text-muted-foreground">
          Provider: {data.ai.providerName} ({data.ai.providerStatus}). Private conversation content
          is not shown.
        </p>
        <MetricGrid
          metrics={[
            data.ai.conversations,
            data.ai.messagesInPeriod,
            data.ai.toolInvocationsInPeriod,
            data.ai.unavailableResponsesInPeriod,
          ]}
        />
      </DashboardSection>

      <div className="grid gap-8 lg:grid-cols-2">
        <DashboardSection title="Recent audit activity">
          <ActivityFeed items={data.recentAudit} />
        </DashboardSection>
        <DashboardSection title="Operations">
          <QuickActions actions={data.quickActions} />
        </DashboardSection>
      </div>
    </div>
  );
}
