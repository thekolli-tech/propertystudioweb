import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Audit' };

export default function AdminAuditPage() {
  return (
    <div>
      <PageHeader
        title="Audit"
        description="Admin audit shell. Complete workflows are deferred to later phases."
      />
      <EmptyState
        title="Audit management not available yet"
        description="This is a navigation placeholder. Authorization remains server-side."
      />
    </div>
  );
}
