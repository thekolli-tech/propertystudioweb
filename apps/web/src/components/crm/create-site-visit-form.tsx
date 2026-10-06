'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, ErrorState, Input, Label } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function CreateSiteVisitForm({
  organizationPublicId,
  leadPublicId,
  contactPublicId,
}: {
  organizationPublicId: string;
  leadPublicId?: string;
  contactPublicId?: string;
}) {
  const router = useRouter();
  const [leadId, setLeadId] = useState(leadPublicId ?? '');
  const [scheduledLocal, setScheduledLocal] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const client = createBrowserApiClient();
      await client.createCrmSiteVisit({
        organizationPublicId,
        leadPublicId: leadId.trim(),
        scheduledAt: new Date(scheduledLocal).toISOString(),
        notes: notes.trim() || null,
        contactPublicId: contactPublicId || null,
      });
      setScheduledLocal('');
      setNotes('');
      if (!leadPublicId) setLeadId('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create site visit.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">Schedule site visit</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {!leadPublicId ? (
          <div className="space-y-1.5">
            <Label htmlFor="crm-sv-lead">Lead ID</Label>
            <Input
              id="crm-sv-lead"
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              required
              placeholder="PS-LEAD-000001"
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="crm-sv-when">Scheduled</Label>
          <Input
            id="crm-sv-when"
            type="datetime-local"
            value={scheduledLocal}
            onChange={(event) => setScheduledLocal(event.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="crm-sv-notes">Notes</Label>
          <Input
            id="crm-sv-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Create site visit'}
      </Button>
      {error ? <ErrorState title="Could not create site visit" message={error} /> : null}
    </form>
  );
}
