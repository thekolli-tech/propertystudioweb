export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';

import { AiSearchForm } from '@/components/ai/ai-search-form';
import { AiSubnav } from '@/components/ai/ai-subnav';
import { getSessionUser } from '@/lib/auth';

export const metadata = { title: 'AI property search' };

export default async function AiSearchPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Natural language search"
        description="Describe a property need in plain language. Results are filtered from the live catalog only."
      />
      <AiSubnav />
      <AiSearchForm organizationPublicId={user?.activeOrganizationPublicId} />
    </div>
  );
}
