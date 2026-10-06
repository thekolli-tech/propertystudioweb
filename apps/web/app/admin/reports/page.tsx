export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { AdminModerateReviewActions } from '@/components/reviews/admin-moderate-review-actions';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin reports' };

/**
 * Backend exposes review reporting + FLAGGED status; there is no dedicated
 * content-report list endpoint yet. This page surfaces flagged reviews for moderation.
 */
export default async function AdminReportsPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let reviews: Awaited<ReturnType<typeof client.adminListFlaggedReviews>>['reviews'] = [];
  let unavailable = false;

  try {
    const response = await client.adminListFlaggedReviews({ limit: 50 });
    reviews = response.reviews;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Flagged reviews and content reports awaiting moderation."
      />

      {unavailable ? (
        <EmptyState
          title="Not available yet"
          description="Reports API is unavailable for this session."
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No open reports"
          description="Reported reviews appear here when users flag review content."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Review</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.publicId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{review.title ?? review.publicId}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{review.body}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {review.subjectType} · {review.subjectPublicId}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="warning">{review.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(review.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <AdminModerateReviewActions reviewPublicId={review.publicId} />
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
