import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardShell, ErrorState } from '@property-studio/ui';

import { AdminNav } from '@/components/admin-nav';
import { AppHeader } from '@/components/app-header';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, getSessionUser } from '@/lib/auth';

function canAccessSuperAdminShell(roles: string[]): boolean {
  return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?next=/admin');
  }

  if (
    user.platformRoles.includes('PROPERTY_ADMIN') &&
    !canAccessSuperAdminShell(user.platformRoles)
  ) {
    redirect('/app/property-admin');
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

  // UX gate only — API remains authoritative for privileged mutations.
  if (!canAccessSuperAdminShell(user.platformRoles)) {
    return (
      <DashboardShell
        sidebar={<AdminNav />}
        header={<AppHeader user={user} organizations={organizations} />}
      >
        <ErrorState
          title="Unauthorized"
          message="The Super Admin console is limited to SUPER_ADMIN / ADMIN platform roles."
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      sidebar={<AdminNav />}
      header={<AppHeader user={user} organizations={organizations} />}
    >
      {children}
    </DashboardShell>
  );
}
