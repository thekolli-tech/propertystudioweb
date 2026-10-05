import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Communities' };

export default function AdminCommunitiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Communities" description="Platform community moderation." />
      <EmptyState
        title="Coming soon"
        description="Community administration APIs are not available yet."
      />
    </div>
  );
}
