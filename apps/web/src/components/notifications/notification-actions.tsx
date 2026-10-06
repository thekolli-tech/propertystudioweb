'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@property-studio/ui';

import { createBrowserApiClient } from '@/lib/api';

export function MarkNotificationReadButton({ publicId }: { publicId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await createBrowserApiClient().markNotificationRead(publicId);
      router.refresh();
    } catch {
      // Keep UI quiet; list refresh will reflect truth.
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick} disabled={pending}>
      {pending ? '…' : 'Mark read'}
    </Button>
  );
}

export function MarkAllNotificationsReadButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      await createBrowserApiClient().markAllNotificationsRead();
      router.refresh();
    } catch {
      // ignore
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" size="sm" onClick={onClick} disabled={pending}>
      {pending ? 'Updating…' : 'Mark all read'}
    </Button>
  );
}
