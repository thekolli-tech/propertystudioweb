export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';

import { AiAssistantForm } from '@/components/ai/ai-assistant-form';
import { AiSubnav } from '@/components/ai/ai-subnav';
import { getSessionUser } from '@/lib/auth';

export const metadata = { title: 'Property Assistant' };

export default async function AiAssistantPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Property Assistant"
        description="Ask a question. Answers include coverage state and a disclaimer — never fabricated figures."
      />
      <AiSubnav />
      <AiAssistantForm organizationPublicId={user?.activeOrganizationPublicId} />
    </div>
  );
}
