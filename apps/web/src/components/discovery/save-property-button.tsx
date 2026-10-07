'use client';

import { useState } from 'react';
import { Button } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function SavePropertyButton({ propertyPublicId }: { propertyPublicId: string }) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function onSave() {
    setStatus('saving');
    setMessage(null);
    try {
      await createBrowserApiClient().createSavedProperty({ propertyPublicId });
      setStatus('saved');
      setMessage('Saved to your account.');
    } catch (err) {
      setStatus('error');
      setMessage(
        err instanceof ApiClientError
          ? err.message
          : 'Sign in as a seeker or investor to save listings.',
      );
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={status === 'saving' || status === 'saved'}
        onClick={() => void onSave()}
      >
        {status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Save property'}
      </Button>
      {message ? <p className="text-xs text-[var(--color-muted)]">{message}</p> : null}
    </div>
  );
}
