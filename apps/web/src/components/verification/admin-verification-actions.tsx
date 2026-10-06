'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Input, Label } from '@property-studio/ui';

import { createBrowserApiClient } from '@/lib/api';

type Action = 'approve' | 'reject' | 'request-changes' | 'revoke';

export function AdminVerificationActions({ casePublicId }: { casePublicId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: Action) {
    setError(null);
    setPending(action);
    try {
      const client = createBrowserApiClient();
      const body = {
        reviewerNotes: notes.trim() || null,
        rejectionReason: rejectionReason.trim() || null,
      };
      if (action === 'approve') await client.approveVerificationCase(casePublicId, body);
      else if (action === 'reject') await client.rejectVerificationCase(casePublicId, body);
      else if (action === 'request-changes')
        await client.requestVerificationChanges(casePublicId, body);
      else await client.revokeVerificationCase(casePublicId, body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setPending(null);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="reviewer-notes">Reviewer notes</Label>
        <Input
          id="reviewer-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={2000}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rejection-reason">Rejection / revoke reason</Label>
        <Input
          id="rejection-reason"
          value={rejectionReason}
          onChange={(event) => setRejectionReason(event.target.value)}
          maxLength={1000}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending !== null} onClick={() => run('approve')}>
          {pending === 'approve' ? '…' : 'Approve'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending !== null}
          onClick={() => run('request-changes')}
        >
          {pending === 'request-changes' ? '…' : 'Request changes'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending !== null}
          onClick={() => run('reject')}
        >
          {pending === 'reject' ? '…' : 'Reject'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending !== null}
          onClick={() => run('revoke')}
        >
          {pending === 'revoke' ? '…' : 'Revoke'}
        </Button>
      </div>
    </form>
  );
}
