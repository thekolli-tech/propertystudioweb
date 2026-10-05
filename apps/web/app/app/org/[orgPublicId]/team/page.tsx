import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Team' };

export default function OrganizationTeamPage() {
  return (
    <div>
      <PageHeader
        title="Team"
        description="Organization team shell. Business domain implementation is deferred."
      />
      <EmptyState
        title="Team not available yet"
        description="This section is a navigation placeholder for future team workflows."
      />
    </div>
  );
}
