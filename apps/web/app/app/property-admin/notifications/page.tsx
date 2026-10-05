import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Notifications' };

export default function PropertyAdminNotificationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Operational alerts for assigned inventory." />
      <EmptyState
        title="No notifications"
        description="Notification APIs are not available yet. This shell is ready for future integration."
      />
    </div>
  );
}
