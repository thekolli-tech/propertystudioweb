export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

export const metadata = { title: 'Notifications' };

/** Org nav entry points to user-scoped notifications. */
export default async function OrganizationNotificationsRedirectPage({
  params,
}: {
  params: Promise<{ orgPublicId: string }>;
}) {
  await params;
  redirect('/app/notifications');
}
