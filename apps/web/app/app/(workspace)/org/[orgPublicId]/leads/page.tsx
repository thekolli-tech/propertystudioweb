export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';
import { ClaimMarketplaceLeadForm } from '@/components/leads/claim-marketplace-lead-form';
import { LeadStatusActions } from '@/components/leads/lead-status-actions';

export const metadata = { title: 'Organization leads' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_FILTERS = [
  { label: 'All', status: undefined },
  { label: 'New', status: 'NEW' },
  { label: 'Assigned', status: 'ASSIGNED' },
  { label: 'Contacted', status: 'CONTACTED' },
  { label: 'Qualified', status: 'QUALIFIED' },
  { label: 'Site visits', status: 'SITE_VISIT' },
  { label: 'Negotiation', status: 'NEGOTIATION' },
  { label: 'Closed', status: 'CLOSED' },
  { label: 'Lost', status: 'LOST' },
] as const;

export default async function OrganizationLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgPublicId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgPublicId } = await params;
  const query = await searchParams;
  const status = first(query.status) as
    | 'NEW'
    | 'ASSIGNED'
    | 'VIEWED'
    | 'CONTACTED'
    | 'QUALIFIED'
    | 'SITE_VISIT'
    | 'NEGOTIATION'
    | 'BOOKED'
    | 'CLOSED'
    | 'LOST'
    | undefined;

  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let leads: Awaited<ReturnType<typeof client.listLeads>>['leads'] = [];
  let unavailable = false;

  try {
    const response = await client.listLeads({
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
        title="Leads"
        description="Marketplace opportunities for this organization. Buyer contact details are not revealed yet."
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => {
          const href = item.status
            ? `/app/org/${orgPublicId}/leads?status=${item.status}`
            : `/app/org/${orgPublicId}/leads`;
          const active = (status ?? undefined) === item.status;
          return (
            <a
              key={item.label}
              href={href}
              className={`rounded-md px-3 py-1.5 text-sm ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </div>

      <ClaimMarketplaceLeadForm organizationPublicId={orgPublicId} />

      {unavailable ? (
        <EmptyState
          title="Not available yet"
          description="Leads API is unavailable, or this organization is not eligible for marketplace leads."
        />
      ) : leads.length === 0 ? (
        <EmptyState
          title="No leads yet."
          description="When your organization engages an active marketplace requirement, leads will appear here."
        />
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <article
              key={lead.publicId}
              className="rounded-lg border border-border bg-card p-4 space-y-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{lead.requirement.headline}</p>
                  <p className="text-sm text-muted-foreground">
                    {lead.publicId} · {lead.requirementPublicId} · Score {lead.matchScore}/100
                  </p>
                </div>
                <StatusBadge tone="info">{lead.status}</StatusBadge>
              </div>
              <p className="text-sm text-muted-foreground">
                {[lead.requirement.locality, lead.requirement.city].filter(Boolean).join(', ')}
              </p>
              <p className="text-xs text-muted-foreground">{lead.matchExplanation}</p>
              <LeadStatusActions publicId={lead.publicId} status={lead.status} />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
