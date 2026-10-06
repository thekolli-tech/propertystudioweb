export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Messages' };

export default async function OrganizationMessagesPage({
  params,
}: {
  params: Promise<{ orgPublicId: string }>;
}) {
  const { orgPublicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let conversations: Awaited<ReturnType<typeof client.listConversations>>['conversations'] = [];
  let unavailable = false;

  try {
    const response = await client.listConversations({
      organizationPublicId: orgPublicId,
      limit: 50,
    });
    conversations = response.conversations;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Lead and organization conversations for this workspace."
      />

      {unavailable ? (
        <EmptyState
          title="Messages unavailable"
          description="The conversations API could not be loaded for this organization."
        />
      ) : conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Conversations appear when lead messaging is started for this organization."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Conversation</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((item) => (
                <tr key={item.publicId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/org/${orgPublicId}/messages/${item.publicId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {item.subjectLabel ?? item.publicId}
                    </Link>
                    {item.leadPublicId ? (
                      <p className="font-mono text-xs text-muted-foreground">{item.leadPublicId}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{item.type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge tone="info">{item.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3">{new Date(item.updatedAt).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
