'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { Button, EmptyState, Input, PageHeader, PropertyCard } from '@property-studio/ui';
import type {
  SavedPropertySummary,
  SavedSearchMatchSummary,
  SavedSearchSummary,
} from '@property-studio/contracts';

import { AskAiLink } from '@/components/ai/ask-ai-link';
import { ApiClientError, createBrowserApiClient } from '@/lib/api';

type Tab = 'properties' | 'searches' | 'matches';

export function SavedWorkspace() {
  const [tab, setTab] = useState<Tab>('properties');
  const [properties, setProperties] = useState<SavedPropertySummary[]>([]);
  const [searches, setSearches] = useState<SavedSearchSummary[]>([]);
  const [matches, setMatches] = useState<SavedSearchMatchSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [searchName, setSearchName] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [alertFrequency, setAlertFrequency] = useState<'OFF' | 'IMMEDIATE'>('OFF');

  function reload() {
    startTransition(async () => {
      setError(null);
      try {
        const client = createBrowserApiClient();
        const [props, saved, matchList] = await Promise.all([
          client.listSavedProperties({ limit: 50 }),
          client.listSavedSearches({ limit: 50 }),
          client.listSavedSearchMatches({ limit: 50 }),
        ]);
        setProperties(props.savedProperties);
        setSearches(saved.savedSearches);
        setMatches(matchList.matches);
      } catch (err) {
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'Unable to load saved items. Sign in with a seeker account to use this workspace.',
        );
      }
    });
  }

  useEffect(() => {
    reload();
  }, []);

  async function createSearch() {
    if (!searchName.trim()) return;
    try {
      await createBrowserApiClient().createSavedSearch({
        name: searchName.trim(),
        criteria: searchCity.trim() ? { city: searchCity.trim() } : {},
        alertFrequency,
      });
      setSearchName('');
      setSearchCity('');
      reload();
      setTab('searches');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not save search.');
    }
  }

  async function toggleAlerts(search: SavedSearchSummary) {
    try {
      await createBrowserApiClient().updateSavedSearch(search.publicId, {
        alertFrequency: search.alertFrequency === 'IMMEDIATE' ? 'OFF' : 'IMMEDIATE',
      });
      reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not update alerts.');
    }
  }

  async function removeProperty(publicId: string) {
    try {
      await createBrowserApiClient().deleteSavedProperty(publicId);
      reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not remove property.');
    }
  }

  async function removeSearch(publicId: string) {
    try {
      await createBrowserApiClient().deleteSavedSearch(publicId);
      reload();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not remove search.');
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Saved"
        description="Bookmarks, saved discovery filters, and smart-alert matches — all owned by your account."
      />

      <div className="flex flex-wrap gap-2">
        <AskAiLink
          label="Compare my saved properties"
          hints={{ focus: 'saved_properties', route: '/app/saved' }}
        />
        <AskAiLink
          label="Ask AI about saved searches"
          hints={{ focus: 'saved_searches', route: '/app/saved' }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['properties', 'Properties'],
            ['searches', 'Saved searches'],
            ['matches', 'Alert matches'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={tab === id ? 'default' : 'outline'}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-[var(--color-danger, #b42318)]" role="alert">
          {error}
        </p>
      ) : null}
      {pending ? <p className="text-sm text-[var(--color-muted)]">Refreshing…</p> : null}

      {tab === 'properties' ? (
        properties.length === 0 ? (
          <EmptyState
            title="No saved properties yet"
            description="Open a published listing and save it, or browse the public catalog."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((item) =>
              item.property ? (
                <div key={item.publicId} className="space-y-2">
                  <PropertyCard
                    linkComponent={Link}
                    href={`/properties/${item.property.publicId}`}
                    title={item.property.title}
                    publicId={item.property.publicId}
                    location={[item.property.locality, item.property.city]
                      .filter(Boolean)
                      .join(', ')}
                    projectLabel={item.property.projectPublicId}
                    configuration={item.property.configuration}
                    bedrooms={item.property.bedrooms}
                    priceMinor={item.property.priceMinor}
                    currency={item.property.currency}
                    availabilityStatus={item.property.availabilityStatus}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void removeProperty(item.publicId)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <EmptyState
                  key={item.publicId}
                  title="Listing unavailable"
                  description="This saved property is no longer published."
                />
              ),
            )}
          </div>
        )
      ) : null}

      {tab === 'searches' ? (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Search name"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <Input
              placeholder="City filter (optional)"
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
            />
            <select
              className="h-10 rounded-[var(--radius)] border border-input bg-card px-3 text-sm"
              value={alertFrequency}
              onChange={(e) => setAlertFrequency(e.target.value as 'OFF' | 'IMMEDIATE')}
            >
              <option value="OFF">Alerts off</option>
              <option value="IMMEDIATE">Immediate alerts</option>
            </select>
            <Button type="button" onClick={() => void createSearch()}>
              Save search
            </Button>
          </div>

          {searches.length === 0 ? (
            <EmptyState
              title="No saved searches"
              description="Capture a filter combination to re-run later or enable smart alerts."
            />
          ) : (
            <ul className="space-y-3">
              {searches.map((search) => (
                <li
                  key={search.publicId}
                  className="flex flex-col gap-3 border-b border-[var(--color-border)] py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{search.name}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {Object.entries(search.criteria)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(' · ') || 'Any published listing'}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      Alerts: {search.alertFrequency} · Matches: {search.matchCount}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void toggleAlerts(search)}
                    >
                      {search.alertFrequency === 'IMMEDIATE' ? 'Disable alerts' : 'Enable alerts'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void removeSearch(search.publicId)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === 'matches' ? (
        matches.length === 0 ? (
          <EmptyState
            title="No alert matches yet"
            description="Enable immediate alerts on a saved search to be notified when matching inventory is published."
          />
        ) : (
          <ul className="space-y-3">
            {matches.map((match) => (
              <li
                key={match.publicId}
                className="flex flex-col gap-1 border-b border-[var(--color-border)] py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{match.propertyTitle ?? match.propertyPublicId}</p>
                  <p className="text-sm text-[var(--color-muted)]">
                    Matched “{match.savedSearchName}” · {new Date(match.matchedAt).toLocaleString()}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/properties/${match.propertyPublicId}`}>View listing</Link>
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
