export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Catalog' };

export default async function AdminCatalogPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const data = await client.getAdminControlCenter({ period: 'DAYS_30' });
    return (
      <div className="space-y-6">
        <PageHeader
          title="Catalog analytics"
          description="Projects, properties, communities, and media — no fabricated geospatial maps."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            data.catalog.projects,
            data.catalog.properties,
            data.catalog.publishedProperties,
            data.catalog.draftProperties,
            data.catalog.communities,
            data.catalog.mediaAssets,
          ].map((metric) => (
            <div key={metric.key} className="rounded-[var(--radius)] border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {metric.label}
                </p>
                <StatusBadge tone={metric.coverageState === 'READY' ? 'success' : 'neutral'}>
                  {metric.coverageState}
                </StatusBadge>
              </div>
              <p className="mt-2 font-display text-2xl font-semibold">{metric.value ?? '—'}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {(
            [
              ['Projects by status', data.catalog.projectsByStatus],
              ['Properties by status', data.catalog.propertiesByStatus],
              ['Published by city', data.catalog.propertiesByCity],
            ] as const
          ).map(([title, rows]) => (
            <section key={title} className="space-y-2">
              <h2 className="text-base font-semibold">{title}</h2>
              <ul className="divide-y divide-border rounded-lg border border-border">
                {rows.map((row) => (
                  <li key={row.key} className="flex justify-between px-3 py-2 text-sm">
                    <span>{row.label}</span>
                    <Badge variant="outline">{row.count}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Operational lists:{' '}
          <Link className="underline" href="/admin/projects">
            projects
          </Link>
          ,{' '}
          <Link className="underline" href="/admin/properties">
            properties
          </Link>
          ,{' '}
          <Link className="underline" href="/admin/communities">
            communities
          </Link>
          .
        </p>
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Catalog analytics" description="Catalog aggregates." />
        <EmptyState
          title="Catalog analytics unavailable"
          description={
            error instanceof ApiClientError ? error.message : 'Could not load catalog analytics.'
          }
        />
      </div>
    );
  }
}
