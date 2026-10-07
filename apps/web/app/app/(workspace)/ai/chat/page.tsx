export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';
import type { AiConversationContextHints } from '@property-studio/contracts';

import { AiChatPanel } from '@/components/ai/ai-chat-panel';
import { AiSubnav } from '@/components/ai/ai-subnav';
import { getSessionUser } from '@/lib/auth';

export const metadata = { title: 'AI Copilot' };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AppAiChatPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  const params = await searchParams;
  const focus = first(params.focus) as AiConversationContextHints['focus'] | undefined;
  const contextHints: AiConversationContextHints = {
    propertyPublicId: first(params.propertyPublicId) ?? null,
    projectPublicId: first(params.projectPublicId) ?? null,
    requirementPublicId: first(params.requirementPublicId) ?? null,
    organizationPublicId:
      first(params.organizationPublicId) ?? user?.activeOrganizationPublicId ?? null,
    focus: focus ?? 'general',
    route: first(params.route) ?? '/app/ai/chat',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Copilot"
        description="Context-aware assistant over authorized Property Studio data. Hints are re-authorized on every turn."
      />
      <AiSubnav />
      <AiChatPanel
        organizationPublicId={user?.activeOrganizationPublicId}
        contextHints={contextHints}
      />
    </div>
  );
}
