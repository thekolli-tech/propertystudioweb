'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@property-studio/ui';

import { createBrowserApiClient } from '@/lib/api';

export function SubmitVerificationButton({ casePublicId }: { casePublicId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setPending(true);
    try {
      const client = createBrowserApiClient();
      await client.submitVerificationCase(casePublicId, { declarationAccepted: true });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" size="sm" onClick={onSubmit} disabled={pending}>
        {pending ? 'Submitting…' : 'Submit for review'}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
