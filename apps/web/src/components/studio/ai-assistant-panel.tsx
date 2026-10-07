'use client';

import { AiAssistantForm } from '@/components/ai/ai-assistant-form';

export type AiAssistantPanelProps = {
  organizationPublicId?: string | null;
  title?: string;
  description?: string;
};

/**
 * Broadcast AI panel. Reuses the Phase 11 assistant client — never a second AI stack.
 */
export function AiAssistantPanel({
  organizationPublicId,
  title = 'AI Assistant',
  description = 'Ask about listings, markets, or infrastructure. Answers use verified catalog data only.',
}: AiAssistantPanelProps) {
  return (
    <section className="space-y-4" aria-labelledby="studio-ai-heading">
      <div>
        <h2
          id="studio-ai-heading"
          className="font-display text-[calc(1.125rem*var(--broadcast-scale))] font-[number:var(--broadcast-weight)] tracking-tight"
        >
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-[calc(0.9rem*var(--broadcast-scale))] text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="ps-broadcast-chart rounded-[var(--radius)] border-2 border-border bg-card p-5 sm:p-6">
        <AiAssistantForm organizationPublicId={organizationPublicId} />
      </div>
    </section>
  );
}
