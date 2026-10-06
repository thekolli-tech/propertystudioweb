import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Requirements' };

export default function AppRequirementsPage() {
  return (
    <div>
      <PageHeader
        title="Requirements"
        description="Track buyer and investor requirements. Domain workflows arrive later."
      />
      <EmptyState
        title="No active requirements yet."
        description="Create requirements when the requirements domain ships."
      />
    </div>
  );
}
