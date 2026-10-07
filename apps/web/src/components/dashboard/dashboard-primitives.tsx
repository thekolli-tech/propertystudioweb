'use client';

import Link from 'next/link';
import type {
  DashboardActivityItem,
  DashboardAttentionItem,
  DashboardMetric,
  DashboardPipelineStage,
  DashboardQuickAction,
  DashboardRecentItem,
} from '@property-studio/contracts';
import {
  Badge,
  Button,
  DashboardSection,
  EmptyState,
  StatusBadge,
  StatCard,
} from '@property-studio/ui';

export function MetricSummary({ metrics }: { metrics: DashboardMetric[] }) {
  if (metrics.length === 0) {
    return (
      <EmptyState title="No metrics yet" description="Counts appear when live records exist." />
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {metrics.map((metric) => (
        <StatCard
          key={metric.key}
          label={metric.label}
          value={metric.value}
          hint={metric.href ? undefined : undefined}
          className="min-w-0"
        />
      ))}
    </div>
  );
}

export function PipelineSummary({ stages }: { stages: DashboardPipelineStage[] }) {
  if (stages.every((stage) => stage.count === 0)) {
    return (
      <EmptyState
        title="Pipeline is empty"
        description="Lead lifecycle stages appear when marketplace or CRM leads exist."
      />
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {stages.map((stage) => (
        <StatusBadge key={stage.key} tone={stage.count > 0 ? 'neutral' : 'neutral'}>
          {stage.label} · {stage.count}
        </StatusBadge>
      ))}
    </div>
  );
}

export function ActivityFeed({ items }: { items: DashboardActivityItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No recent activity"
        description="Audited actions for this scope appear here."
      />
    );
  }
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium text-foreground">{item.summary}</p>
            <p className="text-xs text-muted-foreground">
              {[item.resourceType, item.resourcePublicId].filter(Boolean).join(' · ')}
            </p>
          </div>
          <time className="text-xs text-muted-foreground">
            {new Date(item.occurredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </time>
        </li>
      ))}
    </ul>
  );
}

export function AttentionItems({ items }: { items: DashboardAttentionItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing needs attention"
        description="Alerts appear only from live services."
      />
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.key}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
        >
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{item.severity}</Badge>
              <p className="font-medium">{item.title}</p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </div>
          {item.href ? (
            <Button asChild size="sm" variant="outline">
              <Link href={item.href}>Open</Link>
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function QuickActions({ actions }: { actions: DashboardQuickAction[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button key={action.key} asChild size="sm" variant="outline">
          <Link href={action.href}>{action.label}</Link>
        </Button>
      ))}
    </div>
  );
}

export function RecentItems({
  title,
  description,
  items,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description?: string;
  items: DashboardRecentItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <DashboardSection title={title} description={description}>
      {items.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => {
            const inner = (
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{item.title}</p>
                  {item.subtitle ? (
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  ) : null}
                  <p className="font-mono text-xs text-muted-foreground">{item.publicId}</p>
                </div>
                {item.status ? <StatusBadge tone="neutral">{item.status}</StatusBadge> : null}
              </div>
            );
            return (
              <li key={item.publicId}>
                {item.href ? (
                  <Link href={item.href} className="block transition hover:bg-muted/40">
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      )}
    </DashboardSection>
  );
}
