'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { AiPropertyMatchResponse, PropertyConfiguration } from '@property-studio/contracts';
import { Button, EmptyState, Input, Label, PriceDisplay } from '@property-studio/ui';

import { CoverageBadge } from '@/components/intelligence/coverage-badge';
import { ApiClientError, createBrowserApiClient } from '@/lib/api';

const CONFIGURATIONS: Array<{ value: '' | PropertyConfiguration; label: string }> = [
  { value: '', label: 'Any' },
  { value: 'STUDIO', label: 'Studio' },
  { value: 'ONE_BHK', label: '1 BHK' },
  { value: 'TWO_BHK', label: '2 BHK' },
  { value: 'THREE_BHK', label: '3 BHK' },
  { value: 'FOUR_BHK', label: '4 BHK' },
  { value: 'FIVE_BHK_PLUS', label: '5 BHK+' },
  { value: 'OTHER', label: 'Other' },
];

function rupeesToMinor(value: string): bigint | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const rupees = Number(trimmed);
  if (!Number.isFinite(rupees) || rupees < 0) {
    throw new Error('Budget must be a non-negative number in rupees.');
  }
  return BigInt(Math.round(rupees * 100));
}

export function AiMatchForm({ organizationPublicId }: { organizationPublicId?: string | null }) {
  const [city, setCity] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [configuration, setConfiguration] = useState<'' | PropertyConfiguration>('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiPropertyMatchResponse | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const client = createBrowserApiClient();
      const response = await client.aiPropertyMatch({
        organizationPublicId: organizationPublicId ?? null,
        limit: 10,
        criteria: {
          city: city.trim() || undefined,
          budgetMinMinor: rupeesToMinor(budgetMin),
          budgetMaxMinor: rupeesToMinor(budgetMax),
          configuration: configuration || undefined,
          amenities: [],
        },
      });
      setResult(response);
    } catch (err) {
      setResult(null);
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Match request failed.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="grid max-w-2xl gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ai-match-city">City</Label>
          <Input
            id="ai-match-city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="e.g. Bengaluru"
            minLength={2}
            maxLength={80}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-match-budget-min">Budget min (INR)</Label>
          <Input
            id="ai-match-budget-min"
            type="number"
            min={0}
            step={1}
            value={budgetMin}
            onChange={(event) => setBudgetMin(event.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-match-budget-max">Budget max (INR)</Label>
          <Input
            id="ai-match-budget-max"
            type="number"
            min={0}
            step={1}
            value={budgetMax}
            onChange={(event) => setBudgetMax(event.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ai-match-config">Configuration</Label>
          <select
            id="ai-match-config"
            className="flex h-10 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-sm"
            value={configuration}
            onChange={(event) =>
              setConfiguration(event.target.value as '' | PropertyConfiguration)
            }
            disabled={pending}
          >
            {CONFIGURATIONS.map((item) => (
              <option key={item.label} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? 'Matching…' : 'Find matches'}
          </Button>
        </div>
      </form>

      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <CoverageBadge state={result.coverageState} label="Coverage" />
            <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
          </div>
          {result.matches.length === 0 ? (
            <EmptyState
              title="No matches"
              description="No properties matched these criteria with the available verified catalog data."
            />
          ) : (
            <ul className="divide-y divide-border rounded-[var(--radius)] border border-border">
              {result.matches.map((match) => (
                <li key={match.propertyPublicId} className="space-y-2 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link
                        href={`/properties/${match.propertyPublicId}`}
                        className="font-medium hover:underline"
                      >
                        {match.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {[match.locality, match.city].filter(Boolean).join(', ') ||
                          match.propertyPublicId}
                        {' · '}
                        Score {match.score}
                      </p>
                    </div>
                    <PriceDisplay
                      amountMinor={match.priceMinor}
                      currency={match.currency}
                      size="sm"
                    />
                  </div>
                  {match.reasons.length > 0 ? (
                    <p className="text-xs text-muted-foreground">{match.reasons.join(' · ')}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
