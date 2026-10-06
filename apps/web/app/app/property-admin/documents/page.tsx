import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Documents' };

export default function PropertyAdminDocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Documents" description="Document metadata for assigned resources." />
      <EmptyState
        title="No documents yet"
        description="Document listing for Property Admin scope is not exposed as a dedicated API yet."
      />
    </div>
  );
}
