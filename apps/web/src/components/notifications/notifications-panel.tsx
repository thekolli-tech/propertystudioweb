import { DashboardSection, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import {
  MarkAllNotificationsReadButton,
  MarkNotificationReadButton,
} from '@/components/notifications/notification-actions';
import { NotificationPreferencesForm } from '@/components/notifications/notification-preferences-form';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export async function NotificationsPanel({
  title = 'Notifications',
  description = 'In-app alerts for verification, leads, reviews, and messages.',
}: {
  title?: string;
  description?: string;
}) {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let notifications: Awaited<ReturnType<typeof client.listNotifications>>['notifications'] = [];
  let preferences: Awaited<ReturnType<typeof client.getNotificationPreferences>>['preferences'] =
    [];
  let unavailable = false;

  try {
    const [list, prefs] = await Promise.all([
      client.listNotifications({ limit: 50 }),
      client.getNotificationPreferences(),
    ]);
    notifications = list.notifications;
    preferences = prefs.preferences;
  } catch {
    unavailable = true;
  }

  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      {unavailable ? (
        <EmptyState
          title="Notifications unavailable"
          description="The notifications API could not be loaded for this session."
        />
      ) : (
        <>
          <DashboardSection
            title="Inbox"
            description={
              unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.`
                : 'All caught up.'
            }
            action={notifications.length > 0 ? <MarkAllNotificationsReadButton /> : undefined}
          >
            {notifications.length === 0 ? (
              <EmptyState
                title="No notifications yet"
                description="Verification, lead, review, and message events will appear here."
              />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {notifications.map((item) => (
                  <li
                    key={item.publicId}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.title}</p>
                        <StatusBadge tone={item.readAt ? 'neutral' : 'info'}>
                          {item.readAt ? 'Read' : 'Unread'}
                        </StatusBadge>
                        <StatusBadge tone="neutral">{item.severity}</StatusBadge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.body}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.type.replaceAll('_', ' ')} ·{' '}
                        {new Date(item.createdAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                    {!item.readAt ? <MarkNotificationReadButton publicId={item.publicId} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>

          <NotificationPreferencesForm initialPreferences={preferences} />
        </>
      )}
    </div>
  );
}
