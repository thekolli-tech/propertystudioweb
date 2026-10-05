import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell, ErrorState } from '@property-studio/ui';

import { AdminNav } from '@/components/admin-nav';
import { AppHeader } from '@/components/app-header';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, getSessionUser } from '@/lib/auth';

function hasAdminHint(roles: string[]): boolean {
  return roles.some((role) =>
    ['SUPER_ADMIN', 'ADMIN', 'PROPERTY_ADMIN', 'CONTENT_EDITOR', 'MODERATOR'].includes(role),
  );
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?next=/admin');
  }

  const cookieHeader = await getRequestCookieHeader();
  let organizations: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['listOrganizations']>
  >['organizations'] = [];
  try {
    organizations = (await createServerApiClient(cookieHeader).listOrganizations()).organizations;
  } catch {
    organizations = [];
  }

  // UX hint only — API remains authoritative for any admin mutations.
  if (!hasAdminHint(user.platformRoles)) {
    return (
      <AppShell header={<AppHeader user={user} organizations={organizations} />}>
        <ErrorState
          title="Unauthorized"
          message="You are not authorized to access the admin console."
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      header={<AppHeader user={user} organizations={organizations} />}
      sidebar={<AdminNav />}
    >
      {children}
    </AppShell>
  );
}
