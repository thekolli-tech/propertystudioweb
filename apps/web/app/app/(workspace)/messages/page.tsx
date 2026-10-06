export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Messages' };

export default async function AppMessagesPage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let conversations: Awaited<ReturnType<typeof client.listConversations>>['conversations'] = [];
  let unavailable = false;

  try {
    const response = await client.listConversations({ limit: 50 });
    conversations = response.conversations;
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Your conversations across organizations and leads."
      />

      {unavailable ? (
        <EmptyState
          title="Messages unavailable"
          description="The conversations API could not be loaded for this session."
        />
      ) : conversations.length === 0 ? (
        <EmptyState
          title="No conversations yet"
          description="Lead and organization messaging threads will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Conversation</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((item) => {
                const href = item.organizationPublicId
                  ? `/app/org/${item.organizationPublicId}/messages/${item.publicId}`
                  : `/app/messages/${item.publicId}`;
                return (
                  <tr key={item.publicId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link href={href} className="font-medium text-primary hover:underline">
                        {item.subjectLabel ?? item.publicId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {item.organizationPublicId ?? '—'}
                    </td>
                    <td className="px-4 py-3">{item.type}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone="info">{item.status}</StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(item.updatedAt).toLocaleString('en-IN')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
