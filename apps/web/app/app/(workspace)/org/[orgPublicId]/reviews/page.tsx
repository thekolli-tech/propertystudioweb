export const dynamic = 'force-dynamic';

import { DashboardSection, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Reviews' };

export default async function OrganizationReviewsPage({
  params,
}: {
  params: Promise<{ orgPublicId: string }>;
}) {
  const { orgPublicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let reviews: Awaited<ReturnType<typeof client.listReviews>>['reviews'] = [];
  let unavailable = false;

  try {
    const response = await client.listReviews({
      organizationPublicId: orgPublicId,
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
        description="Reviews related to this organization. Public creation is available from subject pages when eligible."
      />

      {unavailable ? (
        <EmptyState
          title="Reviews unavailable"
          description="The reviews API could not be loaded for this organization."
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Published and moderated reviews for this organization will appear here."
        />
      ) : (
        <DashboardSection title="Organization reviews" description="Latest review activity.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Review</th>
                  <th className="py-2 pr-3 font-medium">Subject</th>
                  <th className="py-2 pr-3 font-medium">Rating</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.publicId} className="border-b border-border/70">
                    <td className="py-2 pr-3">
                      <p className="font-medium">{review.title ?? review.publicId}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{review.body}</p>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {review.subjectType} · {review.subjectPublicId}
                    </td>
                    <td className="py-2 pr-3">{review.overallRating}/5</td>
                    <td className="py-2 pr-3">
                      <StatusBadge tone="info">{review.status}</StatusBadge>
                    </td>
                    <td className="py-2">
                      {new Date(review.createdAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardSection>
      )}
    </div>
  );
}
