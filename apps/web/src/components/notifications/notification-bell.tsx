'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, cn } from '@property-studio/ui';
import { Bell } from 'lucide-react';

import { createBrowserApiClient } from '@/lib/api';

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const client = createBrowserApiClient();
    client
      .listNotifications({ unreadOnly: true, limit: 20 })
      .then((response) => {
        if (!cancelled) setUnreadCount(response.notifications.length);
      })
      .catch(() => {
        if (!cancelled) setUnreadCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showBadge = typeof unreadCount === 'number' && unreadCount > 0;

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      aria-label={showBadge ? `Notifications (${unreadCount} unread)` : 'Notifications'}
      className="relative"
    >
      <Link href="/app/notifications">
        <Bell className="h-4 w-4" />
        {showBadge ? (
          <span
            className={cn(
              'absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full',
              'bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground',
            )}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
