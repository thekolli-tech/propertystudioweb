import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Community' };

export default function OrganizationCommunityPage() {
  return (
    <div>
      <PageHeader
        title="Community"
        description="Developer community surfaces arrive in a later phase."
      />
      <EmptyState
        title="Community coming later"
        description="This navigation placeholder is reserved for community discussions and engagement."
      />
    </div>
  );
}
