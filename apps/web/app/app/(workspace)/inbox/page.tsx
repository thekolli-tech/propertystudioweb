import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Inbox' };

export default function AppInboxPage() {
  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Conversations with agents and developers will appear here."
      />
      <EmptyState
        title="No conversations yet."
        description="Messaging arrives with the CRM and lead workflows."
      />
    </div>
  );
}
