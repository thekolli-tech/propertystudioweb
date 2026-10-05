import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Organizations' };

export default function AdminOrganizationsPage() {
  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Admin organizations shell. Complete workflows are deferred to later phases."
      />
      <EmptyState
        title="Organizations management not available yet"
        description="This is a navigation placeholder. Authorization remains server-side."
      />
    </div>
  );
}
