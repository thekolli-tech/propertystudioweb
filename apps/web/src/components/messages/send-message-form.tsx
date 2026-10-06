'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Input, Label } from '@property-studio/ui';

import { createBrowserApiClient } from '@/lib/api';

export function SendMessageForm({ conversationPublicId }: { conversationPublicId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const client = createBrowserApiClient();
      await client.sendMessage(conversationPublicId, { body: body.trim() });
      setBody('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor="message-body">Message</Label>
        <Input
          id="message-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a message…"
          required
          maxLength={4000}
        />
      </div>
      <Button type="submit" disabled={pending || !body.trim()}>
        {pending ? 'Sending…' : 'Send'}
      </Button>
      {error ? <p className="basis-full text-sm text-destructive">{error}</p> : null}
    </form>
  );
}
