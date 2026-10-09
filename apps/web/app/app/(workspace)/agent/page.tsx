export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, getSessionUser } from '@/lib/auth';

export const metadata = { title: 'Agent workspace' };

export default async function AgentEntryPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?next=/app/agent');
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

  const agencyOrgs = organizations.filter((org) => org.type === 'AGENCY');
  const activeAgency =
    agencyOrgs.find((org) => org.publicId === user.activeOrganizationPublicId) ?? agencyOrgs[0];

  if (!activeAgency) {
    redirect('/app/agent/onboarding');
  }

  redirect(`/app/org/${activeAgency.publicId}`);
}
