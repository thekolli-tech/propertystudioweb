import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Catalog' };

export default function AdminCatalogPage() {
  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Admin catalog shell. Complete workflows are deferred to later phases."
      />
      <EmptyState
        title="Catalog management not available yet"
        description="This is a navigation placeholder. Authorization remains server-side."
      />
    </div>
  );
}
