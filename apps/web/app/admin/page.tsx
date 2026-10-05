import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Admin' };

export default function AdminHomePage() {
  return (
    <div>
      <PageHeader
        title="Admin"
        description="Platform administration shell. Visiting this route is not authorization — the API enforces privileges."
      />
      <EmptyState
        title="Admin workflows deferred"
        description="Use the navigation to explore placeholder sections for organizations, users, moderation, audit, and catalog."
      />
    </div>
  );
}
