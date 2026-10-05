import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '@property-studio/ui';

import { AppHeader } from '@/components/app-header';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, getSessionUser } from '@/lib/auth';

export default async function ApplicationLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?next=/app');
  }

  const cookieHeader = await getRequestCookieHeader();
  let organizations: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['listOrganizations']>
  >['organizations'] = [];
  try {
    const client = createServerApiClient(cookieHeader);
    const result = await client.listOrganizations();
    organizations = result.organizations;
  } catch {
    organizations = [];
  }

  return (
    <AppShell header={<AppHeader user={user} organizations={organizations} />}>{children}</AppShell>
  );
}
