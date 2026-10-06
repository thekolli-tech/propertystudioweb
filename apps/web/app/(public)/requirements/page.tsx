export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import Link from 'next/link';
import {
  EmptyState,
  PageHeader,
  Pagination,
  PriceDisplay,
  StatusBadge,
} from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';
import { PublicRequirementFilters } from '@/components/public/requirement-filter-bar';

export const metadata = { title: 'Requirement marketplace' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PublicRequirementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  const query = {
    propertyType: first(params.propertyType) as
      | 'APARTMENT'
      | 'VILLA'
      | 'PLOT'
      | 'OFFICE'
      | 'SHOP'
      | 'WAREHOUSE'
      | 'OTHER'
      | undefined,
    transactionType: first(params.transactionType) as 'BUY' | 'RENT' | undefined,
    configuration: first(params.configuration) as
      | 'STUDIO'
      | 'ONE_BHK'
      | 'TWO_BHK'
      | 'THREE_BHK'
      | 'FOUR_BHK'
      | 'FIVE_BHK_PLUS'
      | 'OTHER'
      | undefined,
    bedrooms: first(params.bedrooms) ? Number(first(params.bedrooms)) : undefined,
    city: first(params.city),
    locality: first(params.locality),
    timeline: first(params.timeline) as
      | 'IMMEDIATE'
      | 'WITHIN_3_MONTHS'
      | 'WITHIN_6_MONTHS'
      | 'WITHIN_1_YEAR'
      | 'FLEXIBLE'
      | undefined,
    cursor: first(params.cursor),
    limit: 12,
  };

  let requirements: Awaited<ReturnType<typeof client.listPublicRequirements>>['requirements'] =
    [];
  let nextCursor: string | null = null;
  let unavailable = false;

  try {
    const response = await client.listPublicRequirements(query);
    requirements = response.requirements;
    nextCursor = response.nextCursor;
  } catch {
    unavailable = true;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Requirement marketplace"
          description="Anonymized buyer and investor demand. Contact details stay private."
        />
        <Link
          href="/app/requirements/new"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Post a requirement
        </Link>
      </div>

      <Suspense fallback={<div className="h-24 rounded-lg border border-border bg-card" />}>
        <PublicRequirementFilters />
      </Suspense>

      {unavailable ? (
        <EmptyState
          title="Not available yet"
          description="The requirement marketplace API is temporarily unavailable."
        />
      ) : requirements.length === 0 ? (
        <EmptyState
          title="No active requirements yet."
          description="Published marketplace demand will appear here when seekers share anonymized requirements."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {requirements.map((item) => (
            <article
              key={item.publicId}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.intentLabel}
                  </p>
                  <h2 className="mt-1 font-display text-lg font-semibold text-foreground">
                    {item.headline}
                  </h2>
                </div>
                {item.highIntent ? <StatusBadge tone="premium">High Intent</StatusBadge> : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {[item.locality, item.city].filter(Boolean).join(', ')}
              </p>
              <p className="text-base font-semibold text-foreground">
                <PriceDisplay amountMinor={item.budgetMinMinor} currency={item.currency} size="sm" />
                {item.budgetMinMinor || item.budgetMaxMinor ? (
                  <span className="mx-1 text-muted-foreground">–</span>
                ) : null}
                <PriceDisplay
                  amountMinor={item.budgetMaxMinor}
                  currency={item.currency}
                  size="sm"
                  emptyLabel=""
                />
              </p>
              <div className="flex flex-wrap gap-2">
                {item.vaastuRequired ? (
                  <StatusBadge tone="info">Vaastu preferred</StatusBadge>
                ) : null}
                {item.amenities.slice(0, 3).map((amenity) => (
                  <StatusBadge key={amenity} tone="neutral">
                    {amenity}
                  </StatusBadge>
                ))}
              </div>
              <p className="mt-auto text-xs text-muted-foreground">{item.publicId}</p>
            </article>
          ))}
        </div>
      )}

      {nextCursor ? (
        <Pagination
          hasNext
          nextHref={`/requirements?${new URLSearchParams({
            ...Object.fromEntries(
              Object.entries(query)
                .filter(([, value]) => value !== undefined && value !== null)
                .map(([key, value]) => [key, String(value)]),
            ),
            cursor: nextCursor,
          }).toString()}`}
        />
      ) : null}
    </main>
  );
}
