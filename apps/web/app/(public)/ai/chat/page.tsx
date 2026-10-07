export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';

import { AiChatPanel } from '@/components/ai/ai-chat-panel';

export const metadata = { title: 'Property Studio AI Copilot' };

export default function PublicAiChatPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="AI Copilot"
        description="Persistent conversations over Phase 11 authorized tools — public catalog answers only for your signed-in account."
      />
      <AiChatPanel />
    </div>
  );
}
