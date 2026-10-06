'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, ErrorState, Input, Label } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function ClaimMarketplaceLeadForm({
  organizationPublicId,
}: {
  organizationPublicId: string;
}) {
  const router = useRouter();
  const [requirementPublicId, setRequirementPublicId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const client = createBrowserApiClient();
      const lead = await client.createMarketplaceLead({
        organizationPublicId,
        requirementPublicId: requirementPublicId.trim(),
      });
      setMessage(`Lead ${lead.publicId} ready (score ${lead.matchScore}/100).`);
      setRequirementPublicId('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create lead.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-end"
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="requirementPublicId">Engage marketplace requirement</Label>
        <Input
          id="requirementPublicId"
          value={requirementPublicId}
          onChange={(event) => setRequirementPublicId(event.target.value)}
          placeholder="PS-REQ-000001"
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating…' : 'Create lead'}
      </Button>
      {error ? <ErrorState title="Lead creation failed" description={error} /> : null}
      {message ? <p className="text-sm text-muted-foreground sm:basis-full">{message}</p> : null}
    </form>
  );
}
