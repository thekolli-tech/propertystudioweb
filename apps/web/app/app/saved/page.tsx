import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Saved' };

export default function AppSavedPage() {
  return (
    <div>
      <PageHeader
        title="Saved"
        description="Properties and projects you bookmark will appear here."
      />
      <EmptyState
        title="No saved properties yet."
        description="Save listings from the public catalog once available."
      />
    </div>
  );
}
