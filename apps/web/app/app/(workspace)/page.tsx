import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, getSessionUser } from '@/lib/auth';

export const metadata = { title: 'Application' };

export default async function AppHomePage() {
  const user = await getSessionUser();
  const cookieHeader = await getRequestCookieHeader();
  let organizations: Array<{ publicId: string; name: string; type: string }> = [];
  try {
    if (cookieHeader) {
      const result = await createServerApiClient(cookieHeader).listOrganizations();
      organizations = result.organizations;
    }
  } catch {
    organizations = [];
  }

  return (
    <div>
      <PageHeader
        title="Welcome back"
        description={user ? `Signed in as ${user.email}` : undefined}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your workspace</CardTitle>
            <CardDescription>
              Personal tools for requirements, saved properties, and inbox.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/app/requirements">Requirements</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/saved">Saved</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/inbox">Inbox</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/ai">AI tools</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/me">Profile</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>
              Create a Developer or Agency workspace, then switch context via the organization
              switcher. Access is enforced by the API.
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
                    <span className="ml-2 text-muted-foreground">{org.publicId}</span>
                  </span>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/app/org/${org.publicId}`}>Open</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
