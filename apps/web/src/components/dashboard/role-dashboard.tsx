import { DashboardSection, EmptyState, PageHeader, PriceDisplay } from '@property-studio/ui';
import type {
  AdminDashboardResponse,
  AgentDashboardResponse,
  DeveloperDashboardResponse,
  PropertyAdminDashboardResponse,
  SeekerDashboardResponse,
} from '@property-studio/contracts';

import {
  ActivityFeed,
  AttentionItems,
  MetricSummary,
  PipelineSummary,
  QuickActions,
  RecentItems,
} from '@/components/dashboard/dashboard-primitives';

export function DeveloperDashboardView({ data }: { data: DeveloperDashboardResponse }) {
  return (
    <div className="space-y-8">
      <PageHeader
        title={`${data.organizationName} · Developer dashboard`}
        description="Aggregated from live catalog, CRM, verification, and integration services."
      />
      <DashboardSection title="Overview metrics">
        <MetricSummary metrics={data.metrics} />
      </DashboardSection>
      <DashboardSection title="Sales pipeline" description="Existing lead lifecycle statuses only.">
        <PipelineSummary stages={data.pipeline} />
      </DashboardSection>
      <div className="grid gap-8 lg:grid-cols-2">
        <DashboardSection title="Attention">
          <AttentionItems items={data.attentionItems} />
        </DashboardSection>
        <DashboardSection title="Recent activity">
          <ActivityFeed items={data.recentActivity} />
        </DashboardSection>
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <RecentItems
          title="Recent projects"
          items={data.recentProjects}
          emptyTitle="No projects yet"
          emptyDescription="Create a project to populate this list."
        />
        <RecentItems
          title="Recent properties"
          items={data.recentProperties}
          emptyTitle="No properties yet"
          emptyDescription="Add inventory to see recent listings."
        />
      </div>
      <DashboardSection title="Quick actions">
        <QuickActions actions={data.quickActions} />
      </DashboardSection>
    </div>
  );
}

export function AgentDashboardView({ data }: { data: AgentDashboardResponse }) {
  return (
    <div className="space-y-8">
      <PageHeader
        title={`${data.organizationName} · Agency dashboard`}
        description="Requirements, entitled leads, CRM pipeline, and wallet — no fabricated totals."
      />
      <DashboardSection title="Overview metrics">
        <MetricSummary metrics={data.metrics} />
      </DashboardSection>
      {data.walletBalanceMinor != null ? (
        <DashboardSection title="Wallet">
          <PriceDisplay
            amountMinor={data.walletBalanceMinor}
            currency={data.walletCurrency ?? 'INR'}
          />
        </DashboardSection>
      ) : (
        <EmptyState title="No wallet yet" description="Wallet appears after billing setup." />
      )}
      <DashboardSection title="Lead pipeline">
        <PipelineSummary stages={data.pipeline} />
      </DashboardSection>
      <div className="grid gap-8 lg:grid-cols-2">
        <DashboardSection title="Attention">
          <AttentionItems items={data.attentionItems} />
        </DashboardSection>
        <DashboardSection title="Recent activity">
          <ActivityFeed items={data.recentActivity} />
        </DashboardSection>
      </div>
      <RecentItems
        title="Recent leads"
        items={data.recentLeads}
        emptyTitle="No leads yet"
        emptyDescription="Purchased or assigned leads appear here."
      />
      <DashboardSection title="Quick actions">
        <QuickActions actions={data.quickActions} />
      </DashboardSection>
    </div>
  );
}

export function SeekerDashboardView({ data }: { data: SeekerDashboardResponse }) {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Your workspace"
        description="Requirements, conversations, and notifications from your account."
      />
      <DashboardSection title="Overview">
        <MetricSummary metrics={data.metrics} />
      </DashboardSection>
      <DashboardSection title="Attention">
        <AttentionItems items={data.attentionItems} />
      </DashboardSection>
      <div className="grid gap-8 lg:grid-cols-2">
        <RecentItems
          title="Requirements"
          items={data.recentRequirements}
          emptyTitle="No requirements yet"
          emptyDescription="Create a requirement to start matching."
        />
        <RecentItems
          title="Notifications"
          items={data.recentNotifications}
          emptyTitle="No notifications"
          emptyDescription="In-app alerts from Phase 10 appear here."
        />
      </div>
      <DashboardSection title="Quick actions">
        <QuickActions actions={data.quickActions} />
      </DashboardSection>
    </div>
  );
}

export function PropertyAdminDashboardView({ data }: { data: PropertyAdminDashboardResponse }) {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Property Admin dashboard"
        description="Assignment-scoped only — never global admin metrics."
      />
      <DashboardSection title="Assigned scope">
        <MetricSummary metrics={data.metrics} />
      </DashboardSection>
      <DashboardSection title="Attention">
        <AttentionItems items={data.attentionItems} />
      </DashboardSection>
      <div className="grid gap-8 lg:grid-cols-2">
        <RecentItems
          title="Assigned properties"
          items={data.assignedProperties}
          emptyTitle="No assigned properties"
          emptyDescription="A Super Admin must assign resources first."
        />
        <RecentItems
          title="Assigned projects"
          items={data.assignedProjects}
          emptyTitle="No assigned projects"
          emptyDescription="Project assignments appear when granted."
        />
      </div>
      <DashboardSection title="Quick actions">
        <QuickActions actions={data.quickActions} />
      </DashboardSection>
    </div>
  );
}

export function AdminDashboardView({ data }: { data: AdminDashboardResponse }) {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform overview"
        description="Admin aggregates from live modules — never fabricated warehouse totals."
      />
      <DashboardSection title="Platform metrics">
        <MetricSummary metrics={data.metrics} />
      </DashboardSection>
      <div className="grid gap-8 lg:grid-cols-2">
        <DashboardSection title="Attention">
          <AttentionItems items={data.attentionItems} />
        </DashboardSection>
        <DashboardSection title="Recent audit activity">
          <ActivityFeed items={data.recentActivity} />
        </DashboardSection>
      </div>
      <DashboardSection title="Quick actions">
        <QuickActions actions={data.quickActions} />
      </DashboardSection>
    </div>
  );
}
