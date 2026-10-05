import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Properties' };

export default function OrganizationPropertiesPage() {
  return (
    <div>
      <PageHeader
        title="Properties"
        description="Organization properties shell. Business domain implementation is deferred."
      />
      <EmptyState
        title="Properties not available yet"
        description="This section is a navigation placeholder for future properties workflows."
      />
    </div>
  );
}
