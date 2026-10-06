export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DashboardSection, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { AdminVerificationActions } from '@/components/verification/admin-verification-actions';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Verification case' };

export default async function AdminVerificationDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let detail: Awaited<ReturnType<typeof client.adminGetVerificationCase>> | null = null;

  try {
    detail = await client.adminGetVerificationCase(publicId);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound();
    }
    detail = null;
  }

  if (!detail) {
    return (
      <div className="space-y-6">
        <PageHeader title="Verification case" description={publicId} />
        <EmptyState
          title="Case unavailable"
          description="This verification case could not be loaded."
          action={
            <Link href="/admin/verification" className="text-sm font-medium text-primary">
              Back to queue
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={detail.publicId}
        description={`${detail.verificationType} verification · ${detail.subjectPublicId}`}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge tone="info">{detail.status}</StatusBadge>
        <span className="text-muted-foreground">
          Org {detail.organizationPublicId ?? '—'} · subject {detail.subjectType}
        </span>
        <Link
          href="/admin/verification"
          className="ml-auto text-sm font-medium text-primary hover:underline"
        >
          Back to queue
        </Link>
      </div>

      <DashboardSection title="Case details" description="Submitted verification metadata.">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">RERA number</dt>
            <dd className="font-medium">{detail.reraNumber ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Declaration accepted</dt>
            <dd className="font-medium">{detail.declarationAccepted ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Submitted</dt>
            <dd className="font-medium">
              {detail.submittedAt ? new Date(detail.submittedAt).toLocaleString('en-IN') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reviewed</dt>
            <dd className="font-medium">
              {detail.reviewedAt ? new Date(detail.reviewedAt).toLocaleString('en-IN') : '—'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Reviewer notes</dt>
            <dd className="font-medium">{detail.reviewerNotes ?? '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Rejection reason</dt>
            <dd className="font-medium">{detail.rejectionReason ?? '—'}</dd>
          </div>
        </dl>
      </DashboardSection>

      <DashboardSection title="Documents" description="Attached verification evidence.">
        {detail.documents.length === 0 ? (
          <EmptyState
            title="No documents"
            description="Documents attached to this case will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Document</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {detail.documents.map((doc) => (
                  <tr key={doc.publicId} className="border-b border-border/70">
                    <td className="py-2 pr-3 font-mono text-xs">{doc.publicId}</td>
                    <td className="py-2 pr-3">{doc.documentType}</td>
                    <td className="py-2 pr-3">
                      <StatusBadge tone="neutral">{doc.status}</StatusBadge>
                    </td>
                    <td className="py-2">{doc.extractedReference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardSection>

      <DashboardSection
        title="Moderation actions"
        description="Approve, reject, request changes, or revoke this case."
      >
        <AdminVerificationActions casePublicId={detail.publicId} />
      </DashboardSection>
    </div>
  );
}
