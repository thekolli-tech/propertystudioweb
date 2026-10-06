export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, PriceDisplay, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'My requirements' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_TABS = [
  { href: '/app/requirements', label: 'All', status: undefined },
  { href: '/app/requirements?status=ACTIVE', label: 'Active', status: 'ACTIVE' },
  { href: '/app/requirements?status=PAUSED', label: 'Paused', status: 'PAUSED' },
  { href: '/app/requirements?status=FULFILLED', label: 'Fulfilled', status: 'FULFILLED' },
  { href: '/app/requirements?status=CLOSED', label: 'Closed', status: 'CLOSED' },
] as const;

export default async function AppRequirementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status = first(params.status) as
    'DRAFT' | 'ACTIVE' | 'PAUSED' | 'FULFILLED' | 'CLOSED' | 'CANCELLED' | undefined;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let requirements: Awaited<ReturnType<typeof client.listRequirements>>['requirements'] = [];
  let unavailable = false;

  try {
    const response = await client.listRequirements({ status, limit: 50 });
    requirements = response.requirements;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="My Requirements"
          description="Create and manage buyer or investor demand. Marketplace cards stay anonymized."
        />
        <Link
          href="/app/requirements/new"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          New requirement
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const active = (status ?? undefined) === tab.status;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`rounded-md px-3 py-1.5 text-sm ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {unavailable ? (
        <EmptyState
          title="Not available yet"
          description="Requirements API is unavailable for this session."
        />
      ) : requirements.length === 0 ? (
        <EmptyState
          title="No active requirements yet."
          description="Create a requirement to start matching with eligible developers and verified agents."
          action={
            <Link
              href="/app/requirements/new"
              className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground"
            >
              Create requirement
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {requirements.map((item) => (
            <Link
              key={item.publicId}
              href={`/app/requirements/${item.publicId}`}
              className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {item.configuration?.replace(/_/g, ' ') ?? 'Home'} · {item.propertyType} ·{' '}
                    {item.city}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.publicId} · {item.transactionType}
                  </p>
                </div>
                <StatusBadge tone={item.status === 'ACTIVE' ? 'success' : 'neutral'}>
                  {item.status}
                </StatusBadge>
              </div>
              <p className="mt-3 text-sm font-semibold">
                <PriceDisplay
                  amountMinor={item.budgetMinMinor}
                  currency={item.currency}
                  size="sm"
                />
                {(item.budgetMinMinor || item.budgetMaxMinor) && (
                  <span className="mx-1 text-muted-foreground">–</span>
                )}
                <PriceDisplay
                  amountMinor={item.budgetMaxMinor}
                  currency={item.currency}
                  size="sm"
                  emptyLabel=""
                />
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
