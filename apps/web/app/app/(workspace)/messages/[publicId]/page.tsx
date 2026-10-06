export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ApiClientError, createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Conversation' };

/** Prefer org-scoped conversation route when organization is known. */
export default async function AppConversationRedirectPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  try {
    const conversation = await client.getConversation(publicId);
    if (conversation.organizationPublicId) {
      redirect(`/app/org/${conversation.organizationPublicId}/messages/${publicId}`);
    }
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.status === 403)) {
      notFound();
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Conversation could not be opened.</p>
      <Link href="/app/messages" className="text-sm font-medium text-primary hover:underline">
        Back to messages
      </Link>
    </div>
  );
}
