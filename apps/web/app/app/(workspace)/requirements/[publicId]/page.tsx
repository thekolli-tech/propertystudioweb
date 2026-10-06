export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EmptyState, PageHeader, PriceDisplay, StatusBadge } from '@property-studio/ui';

import { createServerApiClient, ApiClientError } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';
import { RequirementActions } from '@/components/requirements/requirement-actions';

export const metadata = { title: 'Requirement detail' };

export default async function RequirementDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const requirement = await client.getRequirement(publicId);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            title={`${requirement.propertyType} in ${requirement.city}`}
            description={requirement.publicId}
          />
          <StatusBadge tone={requirement.status === 'ACTIVE' ? 'success' : 'neutral'}>
            {requirement.status}
          </StatusBadge>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Transaction</dt>
              <dd className="font-medium">{requirement.transactionType}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Configuration</dt>
              <dd className="font-medium">
                {requirement.configuration?.replace(/_/g, ' ') ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Budget</dt>
              <dd className="font-medium">
                <PriceDisplay amountMinor={requirement.budgetMinMinor} size="sm" />
                <span className="mx-1">–</span>
                <PriceDisplay amountMinor={requirement.budgetMaxMinor} size="sm" emptyLabel="—" />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Location</dt>
              <dd className="font-medium">
                {[requirement.locality, requirement.city].filter(Boolean).join(', ')}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Purpose / timeline</dt>
              <dd className="font-medium">
                {requirement.purpose} · {requirement.timeline}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Visibility</dt>
              <dd className="font-medium">{requirement.visibility}</dd>
            </div>
          </dl>
          {requirement.notes ? (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Private notes
              </p>
              <p className="mt-1">{requirement.notes}</p>
            </div>
          ) : null}
          <RequirementActions
            publicId={requirement.publicId}
            status={requirement.status}
            version={requirement.version}
          />
        </div>

        <Link
          href="/app/requirements"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to requirements
        </Link>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    return (
      <EmptyState
        title="Not available yet"
        description="Unable to load this requirement right now."
      />
    );
  }
}
