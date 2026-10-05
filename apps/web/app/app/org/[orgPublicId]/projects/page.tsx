import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Projects' };

export default function OrganizationProjectsPage() {
  return (
    <div>
      <PageHeader
        title="Projects"
        description="Organization projects shell. Business domain implementation is deferred."
      />
      <EmptyState
        title="Projects not available yet"
        description="This section is a navigation placeholder for future projects workflows."
      />
    </div>
  );
}
