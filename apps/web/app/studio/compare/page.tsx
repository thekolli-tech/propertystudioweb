export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';

import { AiCompareForm } from '@/components/ai/ai-compare-form';

export const metadata = { title: 'Studio · Compare' };

export default function StudioComparePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare"
        description="Side-by-side intelligence compare via the Phase 11 AI / intelligence client. Results appear only from live APIs."
      />
      <div className="ps-broadcast-chart rounded-[var(--radius)] border-2 border-border bg-card p-5 sm:p-6">
        <AiCompareForm />
      </div>
    </div>
  );
}
