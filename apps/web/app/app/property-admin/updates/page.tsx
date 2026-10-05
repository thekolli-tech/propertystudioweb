import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Construction updates' };

export default function PropertyAdminUpdatesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Construction updates"
        description="Track progress on assigned projects when update APIs ship."
      />
      <EmptyState
        title="No construction updates yet"
        description="Construction update APIs are not available in this phase. This page is a polished empty foundation."
      />
    </div>
  );
}
