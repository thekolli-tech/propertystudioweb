import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from '@property-studio/ui';

import { SeekerDashboardView } from '@/components/dashboard/role-dashboard';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, getSessionUser } from '@/lib/auth';

export const metadata = { title: 'Application' };

export default async function AppHomePage() {
  const user = await getSessionUser();
  const cookieHeader = await getRequestCookieHeader();
  const client = createServerApiClient(cookieHeader);

  let organizations: Array<{ publicId: string; name: string; type: string }> = [];
  try {
    if (cookieHeader) {
      organizations = (await client.listOrganizations()).organizations;
    }
  } catch {
    organizations = [];
  }

  let seekerDashboard: Awaited<ReturnType<typeof client.getSeekerDashboard>> | null = null;
  let seekerError: string | null = null;
  try {
    seekerDashboard = await client.getSeekerDashboard();
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
      seekerError = null;
    } else if (error instanceof ApiClientError) {
      seekerError = error.message;
    }
  }

  return (
    <div className="space-y-8">
      {seekerDashboard ? (
        <SeekerDashboardView data={seekerDashboard} />
      ) : (
        <>
          <PageHeader
            title="Welcome back"
            description={user ? `Signed in as ${user.email}` : undefined}
          />
          {seekerError ? (
            <EmptyState title="Dashboard unavailable" description={seekerError} />
          ) : null}
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>
              Developer and Agency workspaces use role-aware dashboards under each organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild size="sm">
              <Link href="/app/onboarding">Create organization</Link>
            </Button>
            {organizations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No organization memberships yet.</p>
            ) : (
              organizations.map((org) => (
                <div key={org.publicId} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium text-foreground">{org.name}</span>
                    <span className="ml-2 text-muted-foreground">{org.type}</span>
                  </span>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/app/org/${org.publicId}`}>Open dashboard</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>AI Copilot</CardTitle>
            <CardDescription>Phase 13 chatbot — same backend for all entry points.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href="/app/ai/chat">Open AI Copilot</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
