export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { EmptyState, PageHeader } from '@property-studio/ui';
import type { AdminAnalyticsPeriod } from '@property-studio/contracts';

import { AdminControlCenter } from '@/components/admin/admin-control-center';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin overview' };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminOverviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = (first(params.period) as AdminAnalyticsPeriod | undefined) ?? 'DAYS_30';
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const data = await client.getAdminControlCenter({
      period,
      from: first(params.from),
      to: first(params.to),
    });
    return (
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading control center…</p>}>
        <AdminControlCenter data={data} />
      </Suspense>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin Control Center"
          description="Platform analytics require SUPER_ADMIN / ADMIN access."
        />
        <EmptyState
          title="Control center unavailable"
          description={
            error instanceof ApiClientError ? error.message : 'Could not load admin analytics.'
          }
        />
      </div>
    );
  }
}
