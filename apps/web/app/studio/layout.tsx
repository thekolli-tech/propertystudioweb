import type { ReactNode } from 'react';

import { BroadcastShell } from '@/components/studio/broadcast-shell';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Broadcast Studio',
  description: 'Large-display presentation mode for Property Studio.',
};

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <BroadcastShell>{children}</BroadcastShell>;
}
