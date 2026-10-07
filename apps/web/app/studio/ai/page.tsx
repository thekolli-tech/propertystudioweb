export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';

import { AiChatPanel } from '@/components/ai/ai-chat-panel';
import { getSessionUser } from '@/lib/auth';

export const metadata = { title: 'Studio · AI Copilot' };

export default async function StudioAiPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Copilot"
        description="Broadcast-friendly chat over the same Phase 13 chatbot APIs and Phase 11 authorized tools."
      />
      <AiChatPanel organizationPublicId={user?.activeOrganizationPublicId} variant="broadcast" />
    </div>
  );
}
