'use client';

import { useState, type FormEvent } from 'react';
import type { AiValuationResponse } from '@property-studio/contracts';
import { Button, EmptyState, Input, Label, PriceDisplay } from '@property-studio/ui';

import { CoverageBadge } from '@/components/intelligence/coverage-badge';
import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function AiValuationForm({
  organizationPublicId,
}: {
  organizationPublicId?: string | null;
}) {
  const [propertyPublicId, setPropertyPublicId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiValuationResponse | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const trimmed = propertyPublicId.trim();
      if (!/^PS-PROP-\d+$/.test(trimmed)) {
        throw new Error('Enter a valid property public id (PS-PROP-…).');
      }
      const client = createBrowserApiClient();
      const response = await client.aiValuation({
        propertyPublicId: trimmed,
        organizationPublicId: organizationPublicId ?? null,
      });
      setResult(response);
    } catch (err) {
      setResult(null);
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Valuation request failed.');
      }
    } finally {
      setPending(false);
    }
  }

  const hasEstimate =
    result &&
    result.coverageState === 'READY' &&
    (result.midpointMinor != null ||
      result.lowEstimateMinor != null ||
      result.highEstimateMinor != null);

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ai-valuation-property">Property public id</Label>
          <Input
            id="ai-valuation-property"
            value={propertyPublicId}
            onChange={(event) => setPropertyPublicId(event.target.value)}
            placeholder="PS-PROP-…"
            required
            disabled={pending}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending || propertyPublicId.trim().length === 0}>
          {pending ? 'Requesting…' : 'Request valuation'}
        </Button>
      </form>

      {result ? (
        <div className="max-w-xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <CoverageBadge state={result.coverageState} label="Coverage" />
          </div>
          {!hasEstimate ? (
            <EmptyState
              title="Insufficient verified data"
              description="Insufficient verified data to calculate a valuation."
            />
          ) : (
            <div className="rounded-[var(--radius)] border border-border bg-card p-5 space-y-3">
              {result.midpointMinor ? (
                <div>
                  <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Midpoint
                  </p>
                  <PriceDisplay
                    amountMinor={result.midpointMinor}
                    currency={result.currency}
                    size="lg"
                  />
                </div>
              ) : null}
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {result.lowEstimateMinor ? (
                  <div>
                    <dt className="text-muted-foreground">Low</dt>
                    <dd>
                      <PriceDisplay
                        amountMinor={result.lowEstimateMinor}
                        currency={result.currency}
                        size="sm"
                      />
                    </dd>
                  </div>
                ) : null}
                {result.highEstimateMinor ? (
                  <div>
                    <dt className="text-muted-foreground">High</dt>
                    <dd>
                      <PriceDisplay
                        amountMinor={result.highEstimateMinor}
                        currency={result.currency}
                        size="sm"
                      />
                    </dd>
                  </div>
                ) : null}
              </dl>
              {result.factors.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {result.factors.map((factor) => (
                    <li key={factor}>{factor}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
          <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
