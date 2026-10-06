import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { DashboardShell, ErrorState } from '@property-studio/ui';

import { AppHeader } from '@/components/app-header';
import { PropertyAdminNav } from '@/components/property-admin-nav';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, getSessionUser } from '@/lib/auth';

function isPropertyAdmin(roles: string[]): boolean {
  return roles.includes('PROPERTY_ADMIN');
}

function isSuperAdminShell(roles: string[]): boolean {
  return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
}

export default async function PropertyAdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?next=/app/property-admin');
  }

  // Super admins manage the platform console, not this assignment workspace.
  if (isSuperAdminShell(user.platformRoles) && !isPropertyAdmin(user.platformRoles)) {
    redirect('/admin');
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

  // UX gate only — NestJS assignment checks remain authoritative.
  if (!isPropertyAdmin(user.platformRoles)) {
    return (
      <DashboardShell
        sidebar={<PropertyAdminNav />}
        header={<AppHeader user={user} organizations={organizations} />}
      >
        <ErrorState
          title="Unauthorized"
          message="The Property Admin console is limited to the PROPERTY_ADMIN platform role."
        />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      sidebar={<PropertyAdminNav />}
      header={<AppHeader user={user} organizations={organizations} />}
    >
      {children}
    </DashboardShell>
  );
}
