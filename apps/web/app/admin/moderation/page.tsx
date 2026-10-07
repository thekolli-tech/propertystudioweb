export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Moderation' };

export default async function AdminModerationPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const data = await client.getAdminControlCenter({ period: 'DAYS_30' });
    const metrics = [
      data.trust.openContentReports,
      data.trust.openReviewReports,
      data.media.pendingModeration,
      data.trust.publishedReviews,
    ];
    return (
      <div className="space-y-6">
        <PageHeader
          title="Moderation"
          description="Queues link to existing review/report/media workflows — no duplicate moderation stack."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Link
              key={metric.key}
              href={metric.href ?? '/admin/reports'}
              className="rounded-[var(--radius)] border border-border p-4 transition hover:opacity-90"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
                <StatusBadge tone={metric.coverageState === 'READY' ? 'success' : 'neutral'}>
                  {metric.coverageState}
                </StatusBadge>
              </div>
              <p className="mt-2 font-display text-2xl font-semibold">{metric.value ?? '—'}</p>
            </Link>
          ))}
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            <Link className="underline" href="/admin/reports">
              Content / review reports
            </Link>
          </li>
          <li>
            <Link className="underline" href="/admin/reviews">
              Reviews moderation
            </Link>
          </li>
          <li>
            <Link className="underline" href="/admin/media">
              Media moderation
            </Link>
          </li>
        </ul>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Moderation" description="Trust and media queues." />
        <EmptyState
          title="Moderation overview unavailable"
          description={
            error instanceof ApiClientError ? error.message : 'Could not load moderation overview.'
          }
        />
      </div>
    );
  }
}
