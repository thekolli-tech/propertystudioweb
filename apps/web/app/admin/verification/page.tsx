export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin verification' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STATUS_FILTERS = [
  { label: 'Pending queue', status: 'SUBMITTED' },
  { label: 'Under review', status: 'UNDER_REVIEW' },
  { label: 'Changes requested', status: 'CHANGES_REQUESTED' },
  { label: 'Approved', status: 'APPROVED' },
  { label: 'Rejected', status: 'REJECTED' },
  { label: 'All', status: undefined },
] as const;

export default async function AdminVerificationPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const status = (first(query.status) as
    | 'DRAFT'
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'CHANGES_REQUESTED'
    | 'EXPIRED'
    | 'REVOKED'
    | undefined) ?? 'SUBMITTED';

  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let cases: Awaited<ReturnType<typeof client.adminListVerificationCases>>['cases'] = [];
  let unavailable = false;

  try {
    const response = await client.adminListVerificationCases({
      status: first(query.status) === 'all' ? undefined : status,
      limit: 50,
    });
    cases = response.cases;
  } catch {
    unavailable = true;
  }

  const activeStatus = first(query.status) === 'all' ? undefined : status;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification"
        description="Review professional verification cases submitted by agencies and developers."
      />

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((item) => {
          const href = item.status
            ? `/admin/verification?status=${item.status}`
            : '/admin/verification?status=all';
          const active =
            item.status === undefined
              ? first(query.status) === 'all'
              : activeStatus === item.status && first(query.status) !== 'all';
          return (
            <Link
              key={item.label}
              href={href}
              className={
                active
                  ? 'rounded-md bg-secondary px-3 py-1.5 text-sm font-medium'
                  : 'rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted'
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {unavailable ? (
        <EmptyState
          title="Not available yet"
          description="Admin verification API is unavailable for this session."
        />
      ) : cases.length === 0 ? (
        <EmptyState
          title="No verification cases"
          description="Submitted cases matching this filter will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Case</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.publicId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/verification/${item.publicId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {item.publicId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.organizationPublicId ?? '—'}
                  </td>
                  <td className="px-4 py-3">{item.verificationType}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="info">{item.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {item.submittedAt
                      ? new Date(item.submittedAt).toLocaleString('en-IN')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
