export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DashboardSection, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { CreateFollowUpForm } from '@/components/crm/create-follow-up-form';
import { CrmSubnav } from '@/components/crm/crm-subnav';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'CRM contact detail' };

export default async function CrmContactDetailPage({
  params,
}: {
  params: Promise<{ orgPublicId: string; publicId: string }>;
}) {
  const { orgPublicId, publicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let contact: Awaited<ReturnType<typeof client.getCrmContact>>;
  try {
    contact = await client.getCrmContact(publicId);
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  if (contact.organizationPublicId !== orgPublicId) {
    notFound();
  }

  let activities: Awaited<ReturnType<typeof client.listCrmActivities>>['activities'] = [];
  try {
    const response = await client.listCrmActivities({
      organizationPublicId: orgPublicId,
      contactPublicId: contact.publicId,
      limit: 20,
    });
    activities = response.activities;
  } catch {
    activities = [];
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={contact.displayName}
        description={contact.publicId}
        actions={
          <StatusBadge tone={contact.status === 'ACTIVE' ? 'success' : 'neutral'}>
            {contact.status}
          </StatusBadge>
        }
      />
      <CrmSubnav orgPublicId={orgPublicId} />

      <DashboardSection title="Contact details">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-medium">{contact.contactType}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Preferred method</dt>
            <dd className="font-medium">{contact.preferredContactMethod}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="font-medium">{contact.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium">{contact.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="font-medium">{contact.ownerUserPublicId ?? 'Unassigned'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Source lead</dt>
            <dd className="font-medium">
              {contact.sourceLeadPublicId ? (
                <Link
                  href={`/app/org/${orgPublicId}/crm/leads/${contact.sourceLeadPublicId}`}
                  className="underline-offset-4 hover:underline"
                >
                  {contact.sourceLeadPublicId}
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
        {contact.notes ? (
          <p className="mt-3 text-sm text-muted-foreground">{contact.notes}</p>
        ) : null}
      </DashboardSection>

      <DashboardSection title="Follow-up">
        <CreateFollowUpForm
          organizationPublicId={orgPublicId}
          leadPublicId={contact.sourceLeadPublicId ?? undefined}
          contactPublicId={contact.publicId}
        />
      </DashboardSection>

      <DashboardSection title="Recent activity">
        {activities.length === 0 ? (
          <EmptyState
            title="No activity"
            description="Notes and CRM actions for this contact will appear here."
          />
        ) : (
          <ul className="space-y-2">
            {activities.map((activity) => (
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
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>
    </div>
  );
}
