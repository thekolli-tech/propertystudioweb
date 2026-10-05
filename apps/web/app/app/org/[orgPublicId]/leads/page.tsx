import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Leads' };

export default function OrganizationLeadsPage() {
  return (
    <div>
      <PageHeader
        title="Leads"
        description="Organization leads shell. Business domain implementation is deferred."
      />
      <EmptyState
        title="Leads not available yet"
        description="This section is a navigation placeholder for future leads workflows."
      />
    </div>
  );
}
