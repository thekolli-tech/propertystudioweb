export const dynamic = 'force-dynamic';

import Link from 'next/link';
import type { LeadStatus } from '@property-studio/contracts';
import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { CrmSubnav } from '@/components/crm/crm-subnav';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'CRM leads' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_FILTERS: { label: string; status?: LeadStatus }[] = [
  { label: 'All' },
  { label: 'New', status: 'NEW' },
  { label: 'Assigned', status: 'ASSIGNED' },
  { label: 'Viewed', status: 'VIEWED' },
  { label: 'Contacted', status: 'CONTACTED' },
  { label: 'Qualified', status: 'QUALIFIED' },
  { label: 'Site visit', status: 'SITE_VISIT' },
  { label: 'Negotiation', status: 'NEGOTIATION' },
  { label: 'Booked', status: 'BOOKED' },
  { label: 'Closed', status: 'CLOSED' },
  { label: 'Lost', status: 'LOST' },
];

export default async function CrmLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgPublicId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgPublicId } = await params;
  const query = await searchParams;
  const status = first(query.status) as LeadStatus | undefined;

  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let leads: Awaited<ReturnType<typeof client.listCrmLeads>>['leads'] = [];
  let unavailable = false;

  try {
    const response = await client.listCrmLeads({
      organizationPublicId: orgPublicId,
      status,
      limit: 50,
    });
    leads = response.leads;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM leads"
        description="Operational lead pipeline for this organization."
      />
      <CrmSubnav orgPublicId={orgPublicId} />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => {
          const href = item.status
            ? `/app/org/${orgPublicId}/crm/leads?status=${item.status}`
            : `/app/org/${orgPublicId}/crm/leads`;
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

      {unavailable ? (
        <EmptyState
          title="Unable to load leads"
          description="The CRM leads API is unavailable for this organization."
        />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No CRM leads yet"
          description="When marketplace leads are claimed or assigned, they will appear in this pipeline."
        />
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <article
              key={lead.publicId}
              className="rounded-lg border border-border bg-card p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/app/org/${orgPublicId}/crm/leads/${lead.publicId}`}
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {lead.requirement.headline}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {lead.publicId}
                    {lead.contactDisplayName ? ` · ${lead.contactDisplayName}` : ''}
                  </p>
                </div>
                <StatusBadge tone="info">{lead.status}</StatusBadge>
              </div>
              <p className="text-sm text-muted-foreground">
                {[lead.requirement.locality, lead.requirement.city].filter(Boolean).join(', ') ||
                  'Location not specified'}
              </p>
              <p className="text-xs text-muted-foreground">
                Score {lead.matchScore}/100
                {lead.nextFollowUpAt
                  ? ` · Next follow-up ${new Date(lead.nextFollowUpAt).toLocaleString()}`
                  : ''}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
