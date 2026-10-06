export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DashboardSection, EmptyState, PageHeader, StatusBadge } from '@property-studio/ui';

import { SendMessageForm } from '@/components/messages/send-message-form';
import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Conversation' };

export default async function OrganizationConversationPage({
  params,
}: {
  params: Promise<{ orgPublicId: string; publicId: string }>;
}) {
  const { orgPublicId, publicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let conversation: Awaited<ReturnType<typeof client.getConversation>> | null = null;

  try {
    conversation = await client.getConversation(publicId);
    await client.markConversationRead(publicId).catch(() => undefined);
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
    conversation = null;
  }

  if (!conversation) {
    return (
      <div className="space-y-6">
        <PageHeader title="Conversation" description="Unable to load this thread." />
        <EmptyState
          title="Conversation unavailable"
          description="This conversation could not be loaded."
          action={
            <Link
              href={`/app/org/${orgPublicId}/messages`}
              className="text-sm font-medium text-primary"
            >
              Back to messages
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={conversation.subjectLabel ?? conversation.publicId}
        description={`${conversation.type} conversation · ${conversation.publicId}`}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StatusBadge tone="info">{conversation.status}</StatusBadge>
        {conversation.leadPublicId ? (
          <span className="font-mono text-xs text-muted-foreground">
            {conversation.leadPublicId}
          </span>
        ) : null}
        <Link
          href={`/app/org/${orgPublicId}/messages`}
          className="ml-auto text-sm font-medium text-primary hover:underline"
        >
          All messages
        </Link>
      </div>

      <DashboardSection title="Thread" description="Messages in this conversation.">
        {conversation.messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Send the first message to start this thread."
          />
        ) : (
          <ul className="space-y-3">
            {conversation.messages.map((message) => (
              <li
                key={message.publicId}
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{message.senderUserPublicId}</span>
                  <span>{new Date(message.createdAt).toLocaleString('en-IN')}</span>
                </div>
                <p className="whitespace-pre-wrap">{message.body}</p>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      {conversation.status === 'OPEN' ? (
        <DashboardSection title="Reply" description="Send a message in this conversation.">
          <SendMessageForm conversationPublicId={conversation.publicId} />
        </DashboardSection>
      ) : (
        <EmptyState
          title="Conversation closed"
          description="This conversation is not open for new messages."
        />
      )}
    </div>
  );
}
