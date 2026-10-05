import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Billing' };

export default function OrganizationBillingPage() {
  return (
    <div>
      <PageHeader
        title="Billing"
        description="Organization billing shell. Business domain implementation is deferred."
      />
      <EmptyState
        title="Billing not available yet"
        description="This section is a navigation placeholder for future billing workflows."
      />
    </div>
  );
}
