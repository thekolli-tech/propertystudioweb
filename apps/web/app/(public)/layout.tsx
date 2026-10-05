import type { ReactNode } from 'react';

import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';
import { getSessionUser } from '@/lib/auth';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader authenticated={Boolean(user)} />
      <div className="flex-1">{children}</div>
      <PublicFooter />
    </div>
  );
}
