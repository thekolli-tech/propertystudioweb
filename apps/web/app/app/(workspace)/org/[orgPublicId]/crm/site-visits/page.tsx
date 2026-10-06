export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { CreateSiteVisitForm } from '@/components/crm/create-site-visit-form';
import { CrmSubnav } from '@/components/crm/crm-subnav';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'CRM site visits' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const BUCKETS = [
  { label: 'All', bucket: undefined },
  { label: 'Upcoming', bucket: 'UPCOMING' as const },
  { label: 'Completed', bucket: 'COMPLETED' as const },
  { label: 'Cancelled', bucket: 'CANCELLED' as const },
  { label: 'No show', bucket: 'NO_SHOW' as const },
];

export default async function CrmSiteVisitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgPublicId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgPublicId } = await params;
  const query = await searchParams;
  const bucket = first(query.bucket) as
    'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | undefined;

  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let siteVisits: Awaited<ReturnType<typeof client.listCrmSiteVisits>>['siteVisits'] = [];
  let unavailable = false;

  try {
    const response = await client.listCrmSiteVisits({
      organizationPublicId: orgPublicId,
      bucket,
      limit: 50,
    });
    siteVisits = response.siteVisits;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Site visits" description="Scheduled property visits tied to CRM leads." />
      <CrmSubnav orgPublicId={orgPublicId} />

      <div className="flex flex-wrap gap-2">
        {BUCKETS.map((item) => {
          const href = item.bucket
            ? `/app/org/${orgPublicId}/crm/site-visits?bucket=${item.bucket}`
            : `/app/org/${orgPublicId}/crm/site-visits`;
          const active = (bucket ?? undefined) === item.bucket;
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

      <CreateSiteVisitForm organizationPublicId={orgPublicId} />

      {unavailable ? (
        <EmptyState
          title="Unable to load site visits"
          description="The CRM site visits API is unavailable for this organization."
        />
      ) : siteVisits.length === 0 ? (
        <EmptyState
          title="No site visits scheduled"
          description="Schedule a visit from a lead detail page or using the form above."
        />
      ) : (
        <div className="space-y-3">
          {siteVisits.map((item) => (
            <article
              key={item.publicId}
              className="rounded-lg border border-border bg-card p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {new Date(item.scheduledAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">{item.publicId}</p>
                </div>
                <StatusBadge tone="info">{item.status}</StatusBadge>
              </div>
              {item.outcome ? (
                <p className="text-sm text-muted-foreground">Outcome: {item.outcome}</p>
              ) : null}
              <Link
                href={`/app/org/${orgPublicId}/crm/leads/${item.leadPublicId}`}
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
