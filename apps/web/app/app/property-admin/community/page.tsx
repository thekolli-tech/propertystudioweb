import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Community' };

export default function PropertyAdminCommunityPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Community" description="Community moderation for assigned projects." />
      <EmptyState
        title="No community activity"
        description="Community feeds for Property Admin arrive when community APIs expand."
      />
    </div>
  );
}
