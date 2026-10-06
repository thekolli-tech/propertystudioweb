import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getSessionUser } from '@/lib/auth';

/**
 * Authenticated /app root. Shells live in nested layouts:
 * - (workspace) → consumer / org AppShell
 * - property-admin → dedicated Property Admin DashboardShell
 */
export default async function ApplicationRootLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login?next=/app');
  }

  return children;
}
