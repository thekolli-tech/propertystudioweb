'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { AiPropertySearchResponse } from '@property-studio/contracts';
import { Button, EmptyState, Input, Label, PriceDisplay } from '@property-studio/ui';

import { CoverageBadge } from '@/components/intelligence/coverage-badge';
import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function AiSearchForm({ organizationPublicId }: { organizationPublicId?: string | null }) {
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiPropertySearchResponse | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const client = createBrowserApiClient();
      const response = await client.aiPropertySearch({
        query: query.trim(),
        organizationPublicId: organizationPublicId ?? null,
        limit: 20,
      });
      setResult(response);
    } catch (err) {
      setResult(null);
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Search failed.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ai-search-query">Natural language search</Label>
          <Input
            id="ai-search-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. 3 BHK in Whitefield under 1.5 crore"
            maxLength={500}
            required
            disabled={pending}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending || query.trim().length === 0}>
          {pending ? 'Searching…' : 'Search properties'}
        </Button>
      </form>

      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <CoverageBadge state={result.coverageState} label="Coverage" />
            <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
          </div>
          {(result.parsed.city ||
            result.parsed.locality ||
            result.parsed.bedrooms != null ||
            result.parsed.configuration) && (
            <p className="text-sm text-muted-foreground">
              Parsed:{' '}
              {[
                result.parsed.configuration?.replaceAll('_', ' '),
                result.parsed.bedrooms != null ? `${result.parsed.bedrooms} bed` : null,
                result.parsed.locality,
                result.parsed.city,
              ]
                .filter(Boolean)
                .join(' · ') || 'No structured filters extracted'}
            </p>
          )}
          {result.properties.length === 0 ? (
            <EmptyState
              title="No matching properties"
              description="No catalog listings matched this query with the available verified data."
            />
          ) : (
            <ul className="divide-y divide-border rounded-[var(--radius)] border border-border">
              {result.properties.map((property) => (
                <li
                  key={property.publicId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <Link
                      href={`/properties/${property.publicId}`}
                      className="font-medium hover:underline"
                    >
                      {property.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {[property.locality, property.city].filter(Boolean).join(', ') ||
                        property.publicId}
                    </p>
                  </div>
                  <PriceDisplay
                    amountMinor={property.priceMinor}
                    currency={property.currency}
                    size="sm"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
