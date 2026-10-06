export const dynamic = 'force-dynamic';

import { NotificationsPanel } from '@/components/notifications/notifications-panel';

export const metadata = { title: 'Notifications' };

export default async function AppNotificationsPage() {
  return <NotificationsPanel />;
}
