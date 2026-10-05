import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Media' };

export default function PropertyAdminMediaPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Media" description="Assigned media assets will appear here." />
      <EmptyState
        title="No media yet"
        description="Media management for assigned resources requires object-storage linking APIs beyond this phase."
      />
    </div>
  );
}
