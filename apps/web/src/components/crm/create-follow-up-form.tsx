'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, ErrorState, Input, Label } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function CreateFollowUpForm({
  organizationPublicId,
  leadPublicId,
  contactPublicId,
}: {
  organizationPublicId: string;
  leadPublicId?: string;
  contactPublicId?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [dueLocal, setDueLocal] = useState('');
  const [leadId, setLeadId] = useState(leadPublicId ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const dueAt = new Date(dueLocal).toISOString();
      const client = createBrowserApiClient();
      await client.createCrmFollowUp({
        organizationPublicId,
        title: title.trim(),
        dueAt,
        leadPublicId: leadId.trim() || null,
        contactPublicId: contactPublicId || null,
        priority: 'MEDIUM',
      });
      setTitle('');
      setDueLocal('');
      if (!leadPublicId) setLeadId('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create follow-up.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">Schedule follow-up</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="crm-fu-title">Title</Label>
          <Input
            id="crm-fu-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            placeholder="Call buyer"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="crm-fu-due">Due</Label>
          <Input
            id="crm-fu-due"
            type="datetime-local"
            value={dueLocal}
            onChange={(event) => setDueLocal(event.target.value)}
            required
          />
        </div>
        {!leadPublicId ? (
          <div className="space-y-1.5">
            <Label htmlFor="crm-fu-lead">Lead ID (optional)</Label>
            <Input
              id="crm-fu-lead"
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              placeholder="PS-LEAD-000001"
            />
          </div>
        ) : null}
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Create follow-up'}
      </Button>
      {error ? <ErrorState title="Could not create follow-up" message={error} /> : null}
    </form>
  );
}
