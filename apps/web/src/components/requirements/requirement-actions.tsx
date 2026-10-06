'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, ErrorState } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function RequirementActions({
  publicId,
  status,
}: {
  publicId: string;
  status: string;
  version: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: 'publish' | 'pause' | 'close') {
    setPending(true);
    setError(null);
    try {
      const client = createBrowserApiClient();
      if (action === 'publish') await client.publishRequirement(publicId);
      if (action === 'pause') await client.pauseRequirement(publicId);
      if (action === 'close') await client.closeRequirement(publicId);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Action failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <ErrorState title="Action failed" message={error} /> : null}
      <div className="flex flex-wrap gap-2">
        {(status === 'DRAFT' || status === 'PAUSED') && (
          <Button type="button" disabled={pending} onClick={() => run('publish')}>
            Publish to marketplace
          </Button>
        )}
        {status === 'ACTIVE' && (
          <Button type="button" variant="outline" disabled={pending} onClick={() => run('pause')}>
            Pause
          </Button>
        )}
        {status !== 'CLOSED' && status !== 'CANCELLED' && (
          <Button type="button" variant="outline" disabled={pending} onClick={() => run('close')}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
