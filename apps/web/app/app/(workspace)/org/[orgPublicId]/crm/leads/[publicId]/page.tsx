export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  DashboardSection,
  EmptyState,
  PageHeader,
  PriceDisplay,
  StatusBadge,
} from '@property-studio/ui';

import { AssignLeadForm } from '@/components/crm/assign-lead-form';
import { CreateContactForm } from '@/components/crm/create-contact-form';
import { CreateDealForm } from '@/components/crm/create-deal-form';
import { CreateFollowUpForm } from '@/components/crm/create-follow-up-form';
import { CreateSiteVisitForm } from '@/components/crm/create-site-visit-form';
import { CrmSubnav } from '@/components/crm/crm-subnav';
import { UpdateLeadStatusForm } from '@/components/crm/update-lead-status-form';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'CRM lead detail' };

export default async function CrmLeadDetailPage({
  params,
}: {
  params: Promise<{ orgPublicId: string; publicId: string }>;
}) {
  const { orgPublicId, publicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let lead: Awaited<ReturnType<typeof client.getCrmLeadDetail>>;
  try {
    lead = await client.getCrmLeadDetail(publicId);
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  if (lead.recipientOrganizationPublicId !== orgPublicId) {
    notFound();
  }

  const members = await client
    .listOrganizationMembers(orgPublicId)
    .then((response) => response.members)
    .catch(() => []);

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.requirement.headline}
        description={`${lead.publicId} · ${lead.requirementPublicId}`}
        actions={<StatusBadge tone="info">{lead.status}</StatusBadge>}
      />
      <CrmSubnav orgPublicId={orgPublicId} />

      <DashboardSection title="Lead summary">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Priority</dt>
            <dd className="font-medium">{lead.priority}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Match score</dt>
            <dd className="font-medium">{lead.matchScore}/100</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Assignee</dt>
            <dd className="font-medium">{lead.recipientUserPublicId ?? 'Unassigned'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Contact</dt>
            <dd className="font-medium">
              {lead.contactPublicId ? (
                <Link
                  href={`/app/org/${orgPublicId}/crm/contacts/${lead.contactPublicId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {lead.contactDisplayName ?? lead.contactPublicId}
                </Link>
              ) : (
                'None linked'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Location</dt>
            <dd className="font-medium">
              {[lead.requirement.locality, lead.requirement.city].filter(Boolean).join(', ') || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Budget</dt>
            <dd className="font-medium flex flex-wrap items-center gap-1">
              <PriceDisplay
                amountMinor={lead.requirement.budgetMinMinor}
                size="sm"
                emptyLabel="—"
              />
              <span className="text-muted-foreground">–</span>
              <PriceDisplay
                amountMinor={lead.requirement.budgetMaxMinor}
                size="sm"
                emptyLabel="—"
              />
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-muted-foreground">{lead.matchExplanation}</p>
      </DashboardSection>

      <DashboardSection title="Assignment">
        <AssignLeadForm
          organizationPublicId={orgPublicId}
          leadPublicId={lead.publicId}
          currentAssigneePublicId={lead.recipientUserPublicId}
          expectedVersion={lead.version}
          members={members}
        />
      </DashboardSection>

      <DashboardSection title="Status">
        <UpdateLeadStatusForm
          organizationPublicId={orgPublicId}
          leadPublicId={lead.publicId}
          status={lead.status}
          expectedVersion={lead.version}
        />
      </DashboardSection>

      <DashboardSection title="Contacts">
        {lead.contacts.length === 0 ? (
          <EmptyState
            title="No contacts linked"
            description="Create a contact from this lead to capture buyer details."
          />
        ) : (
          <ul className="space-y-2">
            {lead.contacts.map((contact) => (
              <li
                key={contact.publicId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <Link
                  href={`/app/org/${orgPublicId}/crm/contacts/${contact.publicId}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {contact.displayName}
                </Link>
                <StatusBadge tone="neutral">{contact.status}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <CreateContactForm
            organizationPublicId={orgPublicId}
            sourceLeadPublicId={lead.publicId}
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Follow-ups">
        {lead.followUps.length === 0 ? (
          <EmptyState title="No follow-ups" description="Schedule the next action for this lead." />
        ) : (
          <ul className="space-y-2">
            {lead.followUps.map((item) => (
              <li key={item.publicId} className="rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{item.title}</span>
                  <StatusBadge tone="info">{item.status}</StatusBadge>
                </div>
                <p className="text-muted-foreground">
                  Due {new Date(item.dueAt).toLocaleString()} · {item.priority}
                </p>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <CreateFollowUpForm
            organizationPublicId={orgPublicId}
            leadPublicId={lead.publicId}
            contactPublicId={lead.contactPublicId ?? undefined}
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Site visits">
        {lead.siteVisits.length === 0 ? (
          <EmptyState
            title="No site visits"
            description="Schedule a property visit for this lead."
          />
        ) : (
          <ul className="space-y-2">
            {lead.siteVisits.map((item) => (
              <li key={item.publicId} className="rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{new Date(item.scheduledAt).toLocaleString()}</span>
                  <StatusBadge tone="info">{item.status}</StatusBadge>
                </div>
                {item.notes ? <p className="text-muted-foreground">{item.notes}</p> : null}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <CreateSiteVisitForm
            organizationPublicId={orgPublicId}
            leadPublicId={lead.publicId}
            contactPublicId={lead.contactPublicId ?? undefined}
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Deals">
        {lead.deals.length === 0 ? (
          <EmptyState title="No deals" description="Open a deal when negotiation begins." />
        ) : (
          <ul className="space-y-2">
            {lead.deals.map((deal) => (
              <li
                key={deal.publicId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{deal.publicId}</p>
                  <PriceDisplay
                    amountMinor={deal.expectedValueMinor}
                    currency={deal.currency}
                    size="sm"
                    emptyLabel="No value set"
                  />
                </div>
                <StatusBadge tone="info">{deal.status}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4">
          <CreateDealForm
            organizationPublicId={orgPublicId}
            leadPublicId={lead.publicId}
            contactPublicId={lead.contactPublicId ?? undefined}
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Activity">
        {lead.activities.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Status changes, notes, and CRM actions will appear here."
          />
        ) : (
          <ul className="space-y-2">
            {lead.activities.map((activity) => (
              <li
                key={activity.publicId}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{activity.subject}</span>
                  <StatusBadge tone="neutral">{activity.activityType}</StatusBadge>
                </div>
                <p className="text-muted-foreground">
                  {new Date(activity.occurredAt).toLocaleString()}
                </p>
                {activity.description ? (
                  <p className="mt-1 text-muted-foreground">{activity.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>
    </div>
  );
}
