export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Badge, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Audit' };

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);
  const securityOnly = first(params.securityOnly) === '1';

  try {
    const list = await client.listAdminAuditEvents({
      limit: 40,
      action: first(params.action),
      resourceType: first(params.resourceType),
      securityOnly,
    });

    return (
      <div className="space-y-6">
        <PageHeader
          title="Audit & security"
          description="Append-only audit events. Secrets, hashes, and credentials are never returned."
        />
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/admin/audit"
            className={!securityOnly ? 'font-medium underline' : 'text-muted-foreground'}
          >
            All events
          </Link>
          <Link
            href="/admin/audit?securityOnly=1"
            className={securityOnly ? 'font-medium underline' : 'text-muted-foreground'}
          >
            Security-related
          </Link>
        </div>

        {list.items.length === 0 ? (
          <EmptyState
            title="No audit events"
            description="Insufficient data for the selected filters."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Organization</th>
                  <th className="px-3 py-2">Resource</th>
                  <th className="px-3 py-2">Metadata keys</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((event) => (
                  <tr key={event.id} className="border-b border-border/70">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}
                    </td>
                    <td className="px-3 py-2 font-medium">{event.action}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {event.actorUserPublicId ?? '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {event.organizationPublicId ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {event.resourceType ? (
                          <Badge variant="outline">{event.resourceType}</Badge>
                        ) : null}
                        {event.resourceId ? (
                          <span className="font-mono text-xs">{event.resourceId}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {event.metadataKeys.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <StatusBadge tone="neutral">{event.metadataKeys.join(', ')}</StatusBadge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.nextCursor ? (
          <p className="text-xs text-muted-foreground">
            More events available. Use filters or paginate via the audit API cursor.
          </p>
        ) : null}
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit & security" description="Append-only audit visibility." />
        <EmptyState
          title="Audit log unavailable"
          description={
            error instanceof ApiClientError ? error.message : 'Could not load audit events.'
          }
        />
      </div>
    );
  }
}
