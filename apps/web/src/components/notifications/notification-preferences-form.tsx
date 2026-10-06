'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { NotificationPreference, NotificationType } from '@property-studio/contracts';
import { Button, DashboardSection } from '@property-studio/ui';

import { createBrowserApiClient } from '@/lib/api';

const IN_APP_TYPES: NotificationType[] = [
  'VERIFICATION_SUBMITTED',
  'VERIFICATION_APPROVED',
  'VERIFICATION_REJECTED',
  'VERIFICATION_CHANGES_REQUESTED',
  'NEW_LEAD',
  'LEAD_ASSIGNED',
  'MESSAGE_RECEIVED',
  'REVIEW_PUBLISHED',
  'SYSTEM',
];

export function NotificationPreferencesForm({
  initialPreferences,
}: {
  initialPreferences: NotificationPreference[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enabledByType, setEnabledByType] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const type of IN_APP_TYPES) {
      const match = initialPreferences.find((p) => p.type === type && p.channel === 'IN_APP');
      map[type] = match?.enabled ?? true;
    }
    return map;
  });

  async function onSave() {
    setPending(true);
    setError(null);
    try {
      const preferences: NotificationPreference[] = IN_APP_TYPES.map((type) => ({
        type,
        channel: 'IN_APP' as const,
        enabled: enabledByType[type] ?? true,
      }));
      await createBrowserApiClient().updateNotificationPreferences({ preferences });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update preferences.');
    } finally {
      setPending(false);
    }
  }

  return (
    <DashboardSection
      title="Preferences"
      description="In-app delivery is available now. Email, WhatsApp, and SMS are foundation-only."
    >
      <div className="space-y-4">
        <ul className="space-y-2">
          {IN_APP_TYPES.map((type) => (
            <li key={type} className="flex items-center justify-between gap-3 text-sm">
              <span>{type.replaceAll('_', ' ')}</span>
              <label className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">IN_APP</span>
                <input
                  type="checkbox"
                  checked={enabledByType[type] ?? true}
                  onChange={(event) =>
                    setEnabledByType((prev) => ({ ...prev, [type]: event.target.checked }))
                  }
                />
              </label>
            </li>
          ))}
        </ul>

        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          {(['EMAIL', 'WHATSAPP', 'SMS'] as const).map((channel) => (
            <label
              key={channel}
              className="flex cursor-not-allowed items-center justify-between rounded-md border border-border px-3 py-2 opacity-60"
            >
              <span>{channel}</span>
              <input type="checkbox" disabled checked={false} />
            </label>
          ))}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" onClick={onSave} disabled={pending}>
          {pending ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </DashboardSection>
  );
}
