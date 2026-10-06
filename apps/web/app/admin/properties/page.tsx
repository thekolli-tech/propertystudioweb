import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Properties' };

export default function AdminPropertiesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Properties" description="Platform-wide property administration." />
      <EmptyState
        title="Coming soon"
        description="Use Catalog for current property shells. Dedicated Super Admin property tooling ships later."
      />
    </div>
  );
}
