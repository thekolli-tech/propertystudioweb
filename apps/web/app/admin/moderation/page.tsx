import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Moderation' };

export default function AdminModerationPage() {
  return (
    <div>
      <PageHeader
        title="Moderation"
        description="Admin moderation shell. Complete workflows are deferred to later phases."
      />
      <EmptyState
        title="Moderation management not available yet"
        description="This is a navigation placeholder. Authorization remains server-side."
      />
    </div>
  );
}
