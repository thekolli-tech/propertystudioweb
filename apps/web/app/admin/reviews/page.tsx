export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { AdminModerateReviewActions } from '@/components/reviews/admin-moderate-review-actions';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin reviews' };

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const status = first(query.status) as
    | 'PENDING'
    | 'PUBLISHED'
    | 'HIDDEN'
    | 'REJECTED'
    | 'FLAGGED'
    | undefined;

  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let reviews: Awaited<ReturnType<typeof client.adminListReviews>>['reviews'] = [];
  let unavailable = false;

  try {
    const response = await client.adminListReviews({
      status,
      limit: 50,
    });
    reviews = response.reviews;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews"
        description="Moderate published and pending reviews across the catalog."
      />

      {unavailable ? (
        <EmptyState
          title="Not available yet"
          description="Admin reviews API is unavailable for this session."
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No reviews to moderate"
          description="Reviews appear here when users submit feedback on projects, properties, agents, or developers."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Review</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Status</th>
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
                  <td className="px-4 py-3">{review.overallRating}/5</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="info">{review.status}</StatusBadge>
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
