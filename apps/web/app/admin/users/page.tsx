import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Users' };

export default function AdminUsersPage() {
  return (
    <div>
      <PageHeader
        title="Users"
        description="Admin users shell. Complete workflows are deferred to later phases."
      />
      <EmptyState
        title="Users management not available yet"
        description="This is a navigation placeholder. Authorization remains server-side."
      />
    </div>
  );
}
