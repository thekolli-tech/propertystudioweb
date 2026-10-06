import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '@property-studio/ui';

import { AppHeader } from '@/components/app-header';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, getSessionUser } from '@/lib/auth';

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?next=/app');
  }

  // Dedicated Property Admin console — keep shells separate.
  if (
    user.platformRoles.includes('PROPERTY_ADMIN') &&
    !user.platformRoles.includes('SUPER_ADMIN') &&
    !user.platformRoles.includes('ADMIN')
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

  return (
    <AppShell header={<AppHeader user={user} organizations={organizations} />}>{children}</AppShell>
  );
}
