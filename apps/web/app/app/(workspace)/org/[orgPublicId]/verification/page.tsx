export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { DashboardSection, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { CreateVerificationForm } from '@/components/verification/create-verification-form';
import { SubmitVerificationButton } from '@/components/verification/submit-verification-button';
import { VerifiedBadge } from '@/components/verified-badge';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Verification' };

function statusTone(
  status: string,
): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
    case 'REVOKED':
      return 'danger';
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return 'info';
    case 'CHANGES_REQUESTED':
    case 'EXPIRED':
      return 'warning';
    default:
      return 'neutral';
  }
}

export default async function OrganizationVerificationPage({
  params,
}: {
  params: Promise<{ orgPublicId: string }>;
}) {
  const { orgPublicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let cases: Awaited<ReturnType<typeof client.listVerificationCases>>['cases'] = [];
  let org: Awaited<ReturnType<typeof client.getOrganization>> | null = null;
  let unavailable = false;

  try {
    org = await client.getOrganization(orgPublicId);
    const response = await client.listVerificationCases({
      organizationPublicId: orgPublicId,
      limit: 50,
    });
    cases = response.cases;
  } catch {
    unavailable = true;
  }

  const subjectType = org?.type === 'DEVELOPER' ? 'DEVELOPER' : 'AGENT';
  const subjectPublicId = org?.profilePublicId ?? '';
  const hasApproved = cases.some((item) => item.status === 'APPROVED');
  const canCreate =
    Boolean(subjectPublicId) &&
    !cases.some((item) =>
      ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'].includes(item.status),
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Verification"
        description="Professional verification cases for marketplace trust. Badges appear only after approval."
      />

      {hasApproved ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <VerifiedBadge verified />
          <p className="text-muted-foreground">
            This organization has an approved verification case. The public verified badge is shown
            on published profiles and listings when trust status is VERIFIED.
          </p>
        </div>
      ) : null}

      {unavailable ? (
        <EmptyState
          title="Verification unavailable"
          description="The verification API could not be loaded for this organization."
        />
      ) : (
        <>
          <DashboardSection
            title="Cases"
            description="Draft, submit, and track professional verification."
          >
            {cases.length === 0 ? (
              <EmptyState
                title="No verification cases yet"
                description="Start a verification case to unlock professional marketplace trust signals."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-left text-sm">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Case</th>
                      <th className="py-2 pr-3 font-medium">Type</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Updated</th>
                      <th className="py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((item) => (
                      <tr key={item.publicId} className="border-b border-border/70">
                        <td className="py-2 pr-3 font-mono text-xs">{item.publicId}</td>
                        <td className="py-2 pr-3">{item.verificationType}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>
                        </td>
                        <td className="py-2 pr-3">
                          {new Date(item.updatedAt).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2">
                          {item.status === 'DRAFT' || item.status === 'CHANGES_REQUESTED' ? (
                            <SubmitVerificationButton casePublicId={item.publicId} />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {item.rejectionReason ?? '—'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardSection>

          {canCreate ? (
            <DashboardSection
              title="Start verification"
              description={`Create a ${subjectType} verification case for this organization.`}
            >
              <CreateVerificationForm
                orgPublicId={orgPublicId}
                subjectType={subjectType}
                subjectPublicId={subjectPublicId}
              />
            </DashboardSection>
          ) : !subjectPublicId && !unavailable ? (
            <EmptyState
              title="Profile required"
              description="Complete the organization profile before starting verification."
              action={
                <Link
                  href={`/app/org/${orgPublicId}/settings`}
                  className="text-sm font-medium text-primary"
                >
                  Open settings
                </Link>
              }
            />
          ) : null}
        </>
      )}
    </div>
  );
}
