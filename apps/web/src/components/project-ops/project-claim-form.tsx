'use client';

import { useState, type FormEvent } from 'react';
import { ApiClientError, createBrowserApiClient } from '@/lib/api';
import { Button, Label } from '@property-studio/ui';

type Props = {
  projectPublicId: string;
  organizationPublicId: string;
};

export function ProjectClaimForm({ projectPublicId, organizationPublicId }: Props) {
  const [justification, setJustification] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const claim = await createBrowserApiClient().createProjectClaim(projectPublicId, {
        organizationPublicId,
        justification: justification.trim(),
        submit: true,
      });
      setSuccess(`Claim ${claim.publicId} submitted (${claim.status}).`);
      setJustification('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to submit project claim.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="claim-justification">Why are you claiming this project?</Label>
        <textarea
          id="claim-justification"
          className="min-h-24 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={justification}
          onChange={(event) => setJustification(event.target.value)}
          minLength={10}
          maxLength={2000}
          required
          disabled={pending}
          placeholder="Describe your authorization to manage this project…"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Claiming as organization <span className="font-medium">{organizationPublicId}</span>
      </p>
      <Button type="submit" disabled={pending || justification.trim().length < 10} className="w-full">
        {pending ? 'Submitting…' : 'Submit claim'}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-muted-foreground">{success}</p> : null}
    </form>
  );
}
