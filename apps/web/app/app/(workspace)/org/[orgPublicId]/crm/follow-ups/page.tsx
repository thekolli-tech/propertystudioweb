export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { CreateFollowUpForm } from '@/components/crm/create-follow-up-form';
import { CrmSubnav } from '@/components/crm/crm-subnav';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'CRM follow-ups' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const BUCKETS = [
  { label: 'All', bucket: undefined },
  { label: 'Overdue', bucket: 'OVERDUE' as const },
  { label: 'Today', bucket: 'TODAY' as const },
  { label: 'Upcoming', bucket: 'UPCOMING' as const },
  { label: 'Completed', bucket: 'COMPLETED' as const },
];

export default async function CrmFollowUpsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgPublicId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgPublicId } = await params;
  const query = await searchParams;
  const bucket = first(query.bucket) as 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED' | undefined;

  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let followUps: Awaited<ReturnType<typeof client.listCrmFollowUps>>['followUps'] = [];
  let unavailable = false;

  try {
    const response = await client.listCrmFollowUps({
      organizationPublicId: orgPublicId,
      bucket,
      limit: 50,
    });
    followUps = response.followUps;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-ups"
        description="Scheduled CRM actions and reminders for this organization."
      />
      <CrmSubnav orgPublicId={orgPublicId} />

      <div className="flex flex-wrap gap-2">
        {BUCKETS.map((item) => {
          const href = item.bucket
            ? `/app/org/${orgPublicId}/crm/follow-ups?bucket=${item.bucket}`
            : `/app/org/${orgPublicId}/crm/follow-ups`;
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

      <CreateFollowUpForm organizationPublicId={orgPublicId} />

      {unavailable ? (
        <EmptyState
          title="Unable to load follow-ups"
          description="The CRM follow-ups API is unavailable for this organization."
        />
      ) : followUps.length === 0 ? (
        <EmptyState
          title="No follow-ups scheduled"
          description="Create a follow-up to keep pipeline conversations moving."
        />
      ) : (
        <div className="space-y-3">
          {followUps.map((item) => (
            <article
              key={item.publicId}
              className="rounded-lg border border-border bg-card p-4 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.publicId}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone="info">{item.status}</StatusBadge>
                  <StatusBadge tone="neutral">{item.priority}</StatusBadge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Due {new Date(item.dueAt).toLocaleString()}
              </p>
              {item.leadPublicId ? (
                <Link
                  href={`/app/org/${orgPublicId}/crm/leads/${item.leadPublicId}`}
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  View lead
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
