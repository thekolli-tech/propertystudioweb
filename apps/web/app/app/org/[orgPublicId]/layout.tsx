import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { ErrorState } from '@property-studio/ui';

import { OrganizationNav } from '@/components/organization-nav';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, getSessionUser } from '@/lib/auth';
import { isPublicIdForKind } from '@/lib/public-id';

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ orgPublicId: string }>;
};

export default async function OrganizationLayout({ children, params }: LayoutProps) {
  const { orgPublicId } = await params;
  if (!isPublicIdForKind(orgPublicId, 'organization')) {
    notFound();
  }

  const user = await getSessionUser();
  if (!user) {
    redirect(`/login?next=/app/org/${orgPublicId}`);
  }

  const cookieHeader = await getRequestCookieHeader();
  const client = createServerApiClient(cookieHeader);

  let organization: Awaited<ReturnType<typeof client.getOrganization>> | null = null;
  let accessError: 'not_found' | 'unauthorized' | null = null;

  try {
    organization = await client.getOrganization(orgPublicId);
  } catch (error) {
    if (error instanceof ApiClientError) {
      if (error.status === 401) {
        redirect(`/login?next=/app/org/${orgPublicId}`);
      }
      if (error.status === 403) {
        accessError = 'unauthorized';
      } else {
        accessError = 'not_found';
      }
    } else {
      accessError = 'not_found';
    }
  }

  if (accessError === 'unauthorized') {
    return (
      <ErrorState
        title="Access denied"
        message="You do not have permission to view this organization."
      />
    );
  }

  if (accessError === 'not_found' || !organization) {
    return (
      <ErrorState title="Organization not found" message="This organization is unavailable." />
    );
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-56">
        <div className="rounded-lg border border-border bg-card p-2 lg:sticky lg:top-20 lg:border-0 lg:bg-transparent lg:p-0">
          <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:px-0">
            {organization.name}
          </p>
          <div className="flex gap-1 overflow-x-auto lg:block lg:overflow-visible">
            <OrganizationNav orgPublicId={orgPublicId} organizationType={organization.type} />
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
