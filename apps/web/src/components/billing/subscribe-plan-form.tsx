'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@property-studio/ui';

import { createBrowserApiClient } from '@/lib/api';

export function SubscribePlanForm({
  orgPublicId,
  planPublicId,
}: {
  orgPublicId: string;
  planPublicId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubscribe() {
    setPending(true);
    setError(null);
    try {
      const client = createBrowserApiClient();
      await client.createOrganizationSubscription({
        organizationPublicId: orgPublicId,
        planPublicId,
        provider: 'SANDBOX',
        idempotencyKey: `web-sub-${orgPublicId}-${planPublicId}-${Date.now()}`,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={onSubscribe} disabled={pending}>
        {pending ? 'Subscribing…' : 'Subscribe (sandbox)'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
