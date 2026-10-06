'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Input, Label } from '@property-studio/ui';

import { createBrowserApiClient } from '@/lib/api';

export type CreateVerificationFormProps = {
  orgPublicId: string;
  subjectType: 'AGENT' | 'DEVELOPER';
  subjectPublicId: string;
};

export function CreateVerificationForm({
  orgPublicId,
  subjectType,
  subjectPublicId,
}: CreateVerificationFormProps) {
  const router = useRouter();
  const [reraNumber, setReraNumber] = useState('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const client = createBrowserApiClient();
      await client.createVerificationCase({
        organizationPublicId: orgPublicId,
        subjectType,
        subjectPublicId,
        verificationType: subjectType,
        reraNumber: reraNumber.trim() || null,
        declarationAccepted,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create verification case.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="rera-number">RERA number (optional)</Label>
        <Input
          id="rera-number"
          value={reraNumber}
          onChange={(event) => setReraNumber(event.target.value)}
          placeholder="e.g. P52100000000"
          maxLength={64}
        />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={declarationAccepted}
          onChange={(event) => setDeclarationAccepted(event.target.checked)}
        />
        <span>
          I declare that the information and documents submitted for {subjectType.toLowerCase()}{' '}
          verification are accurate.
        </span>
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending || !subjectPublicId}>
        {pending
          ? 'Creating…'
          : `Start ${subjectType === 'AGENT' ? 'agency' : 'developer'} verification`}
      </Button>
    </form>
  );
}
