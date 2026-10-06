import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Requirements' };

export default function OrganizationRequirementsPage() {
  return (
    <div>
      <PageHeader
        title="Requirements"
        description="Agency requirement workflows arrive in a later phase."
      />
      <EmptyState
        title="Requirements not available yet"
        description="This section is a navigation placeholder for future requirement matching."
      />
    </div>
  );
}
