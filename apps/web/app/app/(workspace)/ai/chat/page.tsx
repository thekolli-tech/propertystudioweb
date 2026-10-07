export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';

import { AiChatPanel } from '@/components/ai/ai-chat-panel';
import { AiSubnav } from '@/components/ai/ai-subnav';
import { getSessionUser } from '@/lib/auth';

export const metadata = { title: 'AI Copilot' };

export default async function AppAiChatPage() {
  const user = await getSessionUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Copilot"
        description="Chat with Property Studio AI. Conversations are private to your account and reuse Phase 11 tools."
      />
      <AiSubnav />
      <AiChatPanel organizationPublicId={user?.activeOrganizationPublicId} />
    </div>
  );
}
