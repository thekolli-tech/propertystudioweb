import { notFound } from 'next/navigation';
import { PageHeader } from '@property-studio/ui';

import { TeamManagement } from '@/components/team/team-management';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader, getSessionUser } from '@/lib/auth';
import { isPublicIdForKind } from '@/lib/public-id';

type PageProps = { params: Promise<{ orgPublicId: string }> };

export const metadata = { title: 'Team' };

export default async function OrganizationTeamPage({ params }: PageProps) {
  const { orgPublicId } = await params;
  if (!isPublicIdForKind(orgPublicId, 'organization')) {
    notFound();
  }

  const user = await getSessionUser();
  if (!user) {
    notFound();
  }

  const cookieHeader = await getRequestCookieHeader();
  const client = createServerApiClient(cookieHeader);
  const organization = await client.getOrganization(orgPublicId);
  const members = await client.listOrganizationMembers(orgPublicId);
  const canManage =
    organization.role === 'DEVELOPER' ||
    organization.role === 'AGENT' ||
    user.platformRoles.includes('SUPER_ADMIN') ||
    user.platformRoles.includes('ADMIN');

  return (
    <div>
      <PageHeader
        title="Team"
        description="Organization membership foundation. Invite existing users and manage active memberships."
      />
      <TeamManagement
        orgPublicId={orgPublicId}
        organizationType={organization.type}
        canManage={canManage}
        initialMembers={members.members}
        currentUserPublicId={user.publicId}
      />
    </div>
  );
}
