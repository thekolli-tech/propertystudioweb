'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ModerateReviewRequest } from '@property-studio/contracts';
import { Button } from '@property-studio/ui';

import { createBrowserApiClient } from '@/lib/api';

const ACTIONS: ModerateReviewRequest['action'][] = ['HIDE', 'REJECT', 'RESTORE', 'FLAG'];

export function AdminModerateReviewActions({ reviewPublicId }: { reviewPublicId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: ModerateReviewRequest['action']) {
    setError(null);
    setPending(action);
    try {
      await createBrowserApiClient().moderateReview(reviewPublicId, { action });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Moderation failed.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {ACTIONS.map((action) => (
          <Button
            key={action}
            type="button"
            size="sm"
            variant="outline"
            disabled={pending !== null}
            onClick={() => run(action)}
          >
            {pending === action ? '…' : action}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
