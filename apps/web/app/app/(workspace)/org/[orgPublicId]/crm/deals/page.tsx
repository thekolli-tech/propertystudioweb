export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, PriceDisplay, StatusBadge } from '@property-studio/ui';

import { CreateDealForm } from '@/components/crm/create-deal-form';
import { CrmSubnav } from '@/components/crm/crm-subnav';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'CRM deals' };

type SearchParams = Record<string, string | string[] | undefined>;
type DealStatus = 'OPEN' | 'NEGOTIATION' | 'BOOKED' | 'CLOSED' | 'LOST';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_FILTERS: { label: string; status?: DealStatus }[] = [
  { label: 'All' },
  { label: 'Open', status: 'OPEN' },
  { label: 'Negotiation', status: 'NEGOTIATION' },
  { label: 'Booked', status: 'BOOKED' },
  { label: 'Closed', status: 'CLOSED' },
  { label: 'Lost', status: 'LOST' },
];

export default async function CrmDealsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgPublicId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgPublicId } = await params;
  const query = await searchParams;
  const status = first(query.status) as DealStatus | undefined;

  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let deals: Awaited<ReturnType<typeof client.listCrmDeals>>['deals'] = [];
  let unavailable = false;

  try {
    const response = await client.listCrmDeals({
      organizationPublicId: orgPublicId,
      status,
      limit: 50,
    });
    deals = response.deals;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deals"
        description="Open negotiations and closed outcomes for this organization."
      />
      <CrmSubnav orgPublicId={orgPublicId} />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => {
          const href = item.status
            ? `/app/org/${orgPublicId}/crm/deals?status=${item.status}`
            : `/app/org/${orgPublicId}/crm/deals`;
          const active = (status ?? undefined) === item.status;
          return (
            <Link
              key={item.label}
              href={href}
              className={`rounded-md px-3 py-1.5 text-sm ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <CreateDealForm organizationPublicId={orgPublicId} />

      {unavailable ? (
        <EmptyState
          title="Unable to load deals"
          description="The CRM deals API is unavailable for this organization."
        />
      ) : deals.length === 0 ? (
        <EmptyState
          title="No deals yet"
          description="Open a deal from a lead when negotiation begins."
        />
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <article
              key={deal.publicId}
              className="rounded-lg border border-border bg-card p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{deal.publicId}</p>
                  <PriceDisplay
                    amountMinor={deal.expectedValueMinor}
                    currency={deal.currency}
                    size="sm"
                    emptyLabel="No value set"
                  />
                </div>
                <StatusBadge tone="info">{deal.status}</StatusBadge>
              </div>
              {deal.expectedCloseDate ? (
                <p className="text-sm text-muted-foreground">
                  Expected close {deal.expectedCloseDate}
                </p>
              ) : null}
              <Link
                href={`/app/org/${orgPublicId}/crm/leads/${deal.leadPublicId}`}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                View lead
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
