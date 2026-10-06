export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';

import { AiValuationForm } from '@/components/ai/ai-valuation-form';
import { AiSubnav } from '@/components/ai/ai-subnav';
import { getSessionUser } from '@/lib/auth';

export const metadata = { title: 'AI valuation' };

export default async function AiValuationPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Valuation"
        description="Request a valuation by property public id. Insufficient verified data yields an empty state — never invented estimates."
      />
      <AiSubnav />
      <AiValuationForm organizationPublicId={user?.activeOrganizationPublicId} />
    </div>
  );
}
