import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Documents' };

export default function OrganizationDocumentsPage() {
  return (
    <div>
      <PageHeader
        title="Documents"
        description="Organization documents shell. Business domain implementation is deferred."
      />
      <EmptyState
        title="Documents not available yet"
        description="This section is a navigation placeholder for future documents workflows."
      />
    </div>
  );
}
