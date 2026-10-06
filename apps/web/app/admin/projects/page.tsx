import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Projects' };

export default function AdminProjectsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Platform-wide project administration." />
      <EmptyState
        title="Coming soon"
        description="Use Catalog for current project shells. Dedicated Super Admin project tooling ships later."
      />
    </div>
  );
}
