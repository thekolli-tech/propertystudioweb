import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'CRM' };

export default function OrganizationCrmPage() {
  return (
    <div>
      <PageHeader
        title="CRM"
        description="Organization CRM shell. Business domain implementation is deferred."
      />
      <EmptyState
        title="CRM not available yet"
        description="This section is a navigation placeholder for future CRM workflows."
      />
    </div>
  );
}
