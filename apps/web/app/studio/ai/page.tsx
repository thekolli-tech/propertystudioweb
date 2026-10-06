export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';

import { AiAssistantPanel } from '@/components/studio/ai-assistant-panel';

export const metadata = { title: 'Studio · AI Assistant' };

export default function StudioAiPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Large-display assistant powered by the existing Phase 11 /api/v1/ai/assistant endpoint — not a second AI."
      />
      <AiAssistantPanel />
    </div>
  );
}
