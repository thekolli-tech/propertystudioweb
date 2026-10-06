'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, ErrorState, Input, Label } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function CreateDealForm({
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
  const [valueRupees, setValueRupees] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const rupees = valueRupees.trim() ? Number(valueRupees) : null;
      const client = createBrowserApiClient();
      await client.createCrmDeal({
        organizationPublicId,
        leadPublicId: leadId.trim(),
        contactPublicId: contactPublicId || null,
        expectedValueMinor:
          rupees !== null && Number.isFinite(rupees)
            ? BigInt(Math.round(rupees * 100))
            : null,
        currency: 'INR',
        expectedCloseDate: closeDate.trim() || null,
        notes: notes.trim() || null,
        status: 'OPEN',
      });
      setValueRupees('');
      setCloseDate('');
      setNotes('');
      if (!leadPublicId) setLeadId('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create deal.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">Open deal</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {!leadPublicId ? (
          <div className="space-y-1.5">
            <Label htmlFor="crm-deal-lead">Lead ID</Label>
            <Input
              id="crm-deal-lead"
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              required
              placeholder="PS-LEAD-000001"
            />
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="crm-deal-value">Expected value (₹)</Label>
          <Input
            id="crm-deal-value"
            type="number"
            min="0"
            step="1"
            value={valueRupees}
            onChange={(event) => setValueRupees(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="crm-deal-close">Expected close</Label>
          <Input
            id="crm-deal-close"
            type="date"
            value={closeDate}
            onChange={(event) => setCloseDate(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="crm-deal-notes">Notes</Label>
          <Input
            id="crm-deal-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Create deal'}
      </Button>
      {error ? <ErrorState title="Could not create deal" message={error} /> : null}
    </form>
  );
}
