export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { AdminModerateReviewActions } from '@/components/reviews/admin-moderate-review-actions';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin reports' };

export default async function AdminReportsPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let reports: Awaited<ReturnType<typeof client.adminListReports>>['reports'] = [];
  let unavailable = false;

  try {
    const response = await client.adminListReports({ limit: 50, status: 'OPEN' });
    reports = response.reports;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Open review and content reports awaiting moderation."
      />

      {unavailable ? (
        <EmptyState
          title="Not available yet"
          description="Reports API is unavailable for this session."
        />
      ) : reports.length === 0 ? (
        <EmptyState
          title="No open reports"
          description="Reported reviews and messages appear here when users flag content."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Report</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.publicId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{report.publicId}</td>
                  <td className="px-4 py-3">{report.kind}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {report.entityType} · {report.entityPublicId}
                  </td>
                  <td className="px-4 py-3">
                    <p>{report.reason}</p>
                    {report.details ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{report.details}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="warning">{report.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(report.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    {report.kind === 'REVIEW_REPORT' ? (
                      <AdminModerateReviewActions reviewPublicId={report.entityPublicId} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Message report</span>
                    )}
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
