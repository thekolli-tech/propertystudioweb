import { PageHeader } from '@property-studio/ui';
import { redirect } from 'next/navigation';

import { OrganizationOnboardingForm } from '@/components/onboarding/organization-onboarding-form';
import { getSessionUser } from '@/lib/auth';

export const metadata = { title: 'Create organization' };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?next=/app/onboarding');
  }

  return (
    <div>
      <PageHeader
        title="Create a professional organization"
        description="Onboard a Developer or Agency workspace. You will become the initial owner."
      />
      <OrganizationOnboardingForm />
    </div>
  );
}
