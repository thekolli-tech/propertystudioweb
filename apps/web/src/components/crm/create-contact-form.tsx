'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, ErrorState, Input, Label } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function CreateContactForm({
  organizationPublicId,
  sourceLeadPublicId,
}: {
  organizationPublicId: string;
  sourceLeadPublicId?: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const client = createBrowserApiClient();
      await client.createCrmContact({
        organizationPublicId,
        displayName: displayName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        sourceLeadPublicId: sourceLeadPublicId || null,
        contactType: 'BUYER',
        preferredContactMethod: 'PHONE',
      });
      setDisplayName('');
      setPhone('');
      setEmail('');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create contact.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">New contact</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="crm-contact-name">Name</Label>
          <Input
            id="crm-contact-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            placeholder="Buyer name"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="crm-contact-phone">Phone</Label>
          <Input
            id="crm-contact-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="crm-contact-email">Email</Label>
          <Input
            id="crm-contact-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Saving…' : 'Create contact'}
      </Button>
      {error ? <ErrorState title="Could not create contact" message={error} /> : null}
    </form>
  );
}
