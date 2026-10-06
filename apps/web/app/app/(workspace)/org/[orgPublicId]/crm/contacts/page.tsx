export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { CreateContactForm } from '@/components/crm/create-contact-form';
import { CrmSubnav } from '@/components/crm/crm-subnav';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'CRM contacts' };

export default async function CrmContactsPage({
  params,
}: {
  params: Promise<{ orgPublicId: string }>;
}) {
  const { orgPublicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let contacts: Awaited<ReturnType<typeof client.listCrmContacts>>['contacts'] = [];
  let unavailable = false;

  try {
    const response = await client.listCrmContacts({
      organizationPublicId: orgPublicId,
      limit: 50,
    });
    contacts = response.contacts;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="Buyer and investor contacts for CRM operations. Not exposed on public routes."
      />
      <CrmSubnav orgPublicId={orgPublicId} />

      <CreateContactForm organizationPublicId={orgPublicId} />

      {unavailable ? (
        <EmptyState
          title="Unable to load contacts"
          description="The CRM contacts API is unavailable for this organization."
        />
      ) : contacts.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Create a contact manually or from a CRM lead detail page."
        />
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <article
              key={contact.publicId}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div>
                <Link
                  href={`/app/org/${orgPublicId}/crm/contacts/${contact.publicId}`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {contact.displayName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {contact.publicId} · {contact.contactType}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[contact.phone, contact.email].filter(Boolean).join(' · ') ||
                    'No phone or email'}
                </p>
              </div>
              <StatusBadge tone={contact.status === 'ACTIVE' ? 'success' : 'neutral'}>
                {contact.status}
              </StatusBadge>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
