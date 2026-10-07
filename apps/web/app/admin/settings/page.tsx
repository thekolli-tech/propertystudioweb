export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Settings' };

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="System settings" description="Platform configuration foundation." />
      <EmptyState
        title="Settings not available yet"
        description="System settings APIs are not exposed in this phase."
      />
    </div>
  );
}
