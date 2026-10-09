import { PageHeader } from '@property-studio/ui';
import { redirect } from 'next/navigation';

import { AgentOnboardingForm } from '@/components/agent-ops/agent-onboarding-form';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, getSessionUser } from '@/lib/auth';

export const metadata = { title: 'Agent onboarding' };

export default async function AgentOnboardingPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?next=/app/agent/onboarding');
  }

  const cookieHeader = await getRequestCookieHeader();
  try {
    const { organizations } = await createServerApiClient(cookieHeader).listOrganizations();
    const agency = organizations.find((org) => org.type === 'AGENCY');
    if (agency) {
      redirect(`/app/org/${agency.publicId}`);
    }
  } catch {
    // Continue to onboarding when org list is unavailable.
  }

  return (
    <div>
      <PageHeader
        title="Become a verified agent"
        description="Onboard as an individual agent or agency. Both create an Agency workspace — verification unlocks professional listings and marketplace access."
      />
      <AgentOnboardingForm />
    </div>
  );
}
