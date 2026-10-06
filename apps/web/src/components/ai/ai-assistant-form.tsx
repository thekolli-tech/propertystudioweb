'use client';

import { useState, type FormEvent } from 'react';
import type { AiAssistantResponse } from '@property-studio/contracts';
import { Button, Label } from '@property-studio/ui';

import { CoverageBadge } from '@/components/intelligence/coverage-badge';
import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function AiAssistantForm({
  organizationPublicId,
}: {
  organizationPublicId?: string | null;
}) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAssistantResponse | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const client = createBrowserApiClient();
      const response = await client.aiAssistant({
        message: message.trim(),
        organizationPublicId: organizationPublicId ?? null,
        contextPropertyPublicIds: [],
        contextProjectPublicIds: [],
      });
      setResult(response);
    } catch (err) {
      setResult(null);
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Assistant request failed.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ai-assistant-message">Your question</Label>
          <textarea
            id="ai-assistant-message"
            className="min-h-32 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask about listings, markets, or infrastructure — answers use verified catalog data only."
            maxLength={4000}
            required
            disabled={pending}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending || message.trim().length === 0}>
          {pending ? 'Asking…' : 'Ask assistant'}
        </Button>
      </form>

      {result ? (
        <div className="max-w-2xl space-y-3 rounded-[var(--radius)] border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">Answer</p>
            <CoverageBadge state={result.coverageState} />
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {result.answer}
          </p>
          {result.references.length > 0 ? (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {result.references.map((ref, index) => (
                <li key={`${ref.kind}-${ref.publicId ?? index}`}>
                  {ref.label}
                  {ref.publicId ? ` (${ref.publicId})` : ''}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
