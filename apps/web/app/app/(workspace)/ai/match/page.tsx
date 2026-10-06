export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';

import { AiMatchForm } from '@/components/ai/ai-match-form';
import { AiSubnav } from '@/components/ai/ai-subnav';
import { getSessionUser } from '@/lib/auth';

export const metadata = { title: 'AI property match' };

export default async function AiMatchPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property match"
        description="Match by budget, city, and configuration against verified catalog listings."
      />
      <AiSubnav />
      <AiMatchForm organizationPublicId={user?.activeOrganizationPublicId} />
    </div>
  );
}
