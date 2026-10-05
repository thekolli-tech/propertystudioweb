import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Settings' };

export default function OrganizationSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        description="Organization settings shell. Business domain implementation is deferred."
      />
      <EmptyState
        title="Settings not available yet"
        description="This section is a navigation placeholder for future settings workflows."
      />
    </div>
  );
}
