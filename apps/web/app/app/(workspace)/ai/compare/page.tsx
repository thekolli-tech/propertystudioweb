export const dynamic = 'force-dynamic';

import { PageHeader } from '@property-studio/ui';

import { AiCompareForm } from '@/components/ai/ai-compare-form';
import { AiSubnav } from '@/components/ai/ai-subnav';

export const metadata = { title: 'Compare' };

export default function AiComparePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Compare"
        description="Compare two to five properties or projects using verified intelligence fields only."
      />
      <AiSubnav />
      <AiCompareForm />
    </div>
  );
}
