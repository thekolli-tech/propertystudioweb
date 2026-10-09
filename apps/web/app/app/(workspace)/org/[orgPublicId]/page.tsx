import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button, EmptyState, PageHeader } from '@property-studio/ui';

import { AgentWorkspaceBanner } from '@/components/agent-ops/agent-workspace-banner';
import { AgentDashboardView, DeveloperDashboardView } from '@/components/dashboard/role-dashboard';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';
import { isPublicIdForKind } from '@/lib/public-id';

type PageProps = { params: Promise<{ orgPublicId: string }> };

export const metadata = { title: 'Organization overview' };

export default async function OrganizationOverviewPage({ params }: PageProps) {
  const { orgPublicId } = await params;
  if (!isPublicIdForKind(orgPublicId, 'organization')) {
    notFound();
  }

  const cookieHeader = await getRequestCookieHeader();
  const client = createServerApiClient(cookieHeader);

  let organization: Awaited<ReturnType<typeof client.getOrganization>>;
  try {
    organization = await client.getOrganization(orgPublicId);
  } catch {
    notFound();
  }

  if (organization.type === 'DEVELOPER') {
    try {
      const dashboard = await client.getDeveloperDashboard(orgPublicId);
      return <DeveloperDashboardView data={dashboard} />;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        notFound();
      }
      return (
        <div className="space-y-6">
          <PageHeader title="Developer dashboard" description="Unable to load aggregates." />
          <EmptyState
            title="Dashboard unavailable"
            description={error instanceof Error ? error.message : 'Try again shortly.'}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href={`/app/org/${orgPublicId}/projects`}>Open projects</Link>
              </Button>
            }
          />
        </div>
      );
    }
  }

  if (organization.type === 'AGENCY') {
    let agentStatus: Awaited<ReturnType<typeof client.getAgentProfessionalStatus>> | null = null;
    try {
      agentStatus = await client.getAgentProfessionalStatus(orgPublicId);
    } catch {
      agentStatus = null;
    }

    try {
      const dashboard = await client.getAgentDashboard(orgPublicId);
      return (
        <div className="space-y-6">
          {agentStatus ? (
            <AgentWorkspaceBanner orgPublicId={orgPublicId} status={agentStatus} />
          ) : null}
          <AgentDashboardView data={dashboard} />
        </div>
      );
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) {
        notFound();
      }
      return (
        <div className="space-y-6">
          {agentStatus ? (
            <AgentWorkspaceBanner orgPublicId={orgPublicId} status={agentStatus} />
          ) : null}
          <PageHeader title="Agency dashboard" description="Unable to load aggregates." />
          <EmptyState
            title="Dashboard unavailable"
            description={error instanceof Error ? error.message : 'Try again shortly.'}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href={`/app/org/${orgPublicId}/crm`}>Open CRM</Link>
              </Button>
            }
          />
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={organization.name} description="Organization overview." />
      <EmptyState
        title="No role dashboard for this organization type"
        description="Developer and Agency organizations have unified dashboards."
      />
    </div>
  );
}
