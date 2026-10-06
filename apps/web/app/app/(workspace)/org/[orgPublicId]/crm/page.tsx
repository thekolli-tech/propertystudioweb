export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {
  DashboardSection,
  EmptyState,
  PageHeader,
  StatCard,
} from '@property-studio/ui';
import {
  CalendarClock,
  Handshake,
  Inbox,
  MapPin,
  Users,
} from 'lucide-react';

import { CrmSubnav } from '@/components/crm/crm-subnav';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'CRM' };

export default async function OrganizationCrmPage({
  params,
}: {
  params: Promise<{ orgPublicId: string }>;
}) {
  const { orgPublicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let overview: Awaited<ReturnType<typeof client.getCrmOverview>> | null = null;
  let unavailable = false;

  try {
    overview = await client.getCrmOverview({ organizationPublicId: orgPublicId });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        description="Lead operations, contacts, follow-ups, site visits, and deals for this organization."
      />
      <CrmSubnav orgPublicId={orgPublicId} />

      {unavailable || !overview ? (
        <EmptyState
          title="CRM unavailable"
          description="The CRM overview API could not be loaded for this organization."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Active leads"
              value={overview.activeLeads}
              hint="Leads currently in the pipeline."
              icon={<Inbox className="h-4 w-4" />}
            />
            <StatCard
              label="New leads"
              value={overview.newLeads}
              hint="Leads in NEW status."
              icon={<Inbox className="h-4 w-4" />}
            />
            <StatCard
              label="Follow-ups due"
              value={overview.followUpsDue}
              hint="Open follow-ups that need attention."
              icon={<CalendarClock className="h-4 w-4" />}
            />
            <StatCard
              label="Upcoming site visits"
              value={overview.upcomingSiteVisits}
              hint="Scheduled visits not yet completed."
              icon={<MapPin className="h-4 w-4" />}
            />
            <StatCard
              label="Qualified leads"
              value={overview.qualifiedLeads}
              hint="Leads marked QUALIFIED."
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              label="Open negotiations"
              value={overview.openNegotiations}
              hint="Leads in NEGOTIATION."
              icon={<Handshake className="h-4 w-4" />}
            />
            <StatCard
              label="Booked deals"
              value={overview.bookedDeals}
              hint="Deals booked from CRM."
              icon={<Handshake className="h-4 w-4" />}
            />
            <StatCard
              label="Closed deals"
              value={overview.closedDeals}
              hint="Successfully closed deals."
              icon={<Handshake className="h-4 w-4" />}
            />
            <StatCard
              label="Contacts"
              value={overview.contacts}
              hint="CRM contacts for this organization."
              icon={<Users className="h-4 w-4" />}
            />
          </div>

          <DashboardSection
            title="Quick links"
            description="Jump into the CRM workspace sections."
          >
            <div className="flex flex-wrap gap-3 text-sm">
              <Link
                className="text-primary underline-offset-4 hover:underline"
                href={`/app/org/${orgPublicId}/crm/leads`}
              >
                Leads
              </Link>
              <Link
                className="text-primary underline-offset-4 hover:underline"
                href={`/app/org/${orgPublicId}/crm/contacts`}
              >
                Contacts
              </Link>
              <Link
                className="text-primary underline-offset-4 hover:underline"
                href={`/app/org/${orgPublicId}/crm/follow-ups`}
              >
                Follow-ups
              </Link>
              <Link
                className="text-primary underline-offset-4 hover:underline"
                href={`/app/org/${orgPublicId}/crm/site-visits`}
              >
                Site visits
              </Link>
              <Link
                className="text-primary underline-offset-4 hover:underline"
                href={`/app/org/${orgPublicId}/crm/deals`}
              >
                Deals
              </Link>
            </div>
          </DashboardSection>
        </>
      )}
    </div>
  );
}
