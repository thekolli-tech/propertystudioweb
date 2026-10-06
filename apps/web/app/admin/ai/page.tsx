export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Admin AI' };

export default function AdminAiPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="AI jobs"
        description="Foundation for reviewing AI orchestration jobs. A list endpoint is not available yet."
      />
      <EmptyState
        title="AI job list not available yet"
        description="Individual jobs can be fetched by public id via the AI API. An admin list surface will appear when that endpoint ships — no fabricated job history is shown."
      />
    </div>
  );
}
