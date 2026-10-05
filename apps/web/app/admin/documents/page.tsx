import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Documents' };

export default function AdminDocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="Platform document moderation foundation." />
      <EmptyState
        title="Documents not available yet"
        description="Cross-tenant document administration arrives with the document domain."
      />
    </div>
  );
}
