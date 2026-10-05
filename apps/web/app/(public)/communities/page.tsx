export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Badge, EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Communities' };

export default function CommunitiesPage() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Communities"
        description="Community discovery foundation. Public community listing APIs are not exposed yet — this page stays honest."
      />
      <EmptyState
        title="No communities to discover yet"
        description="Community records can be created by developer organizations. A public discovery endpoint will unlock this grid without fake cards."
        action={
          <Link href="/projects" className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
            Browse published projects
          </Link>
        }
      />
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        <Badge variant="outline">Foundation</Badge>
        <p className="mt-2">
          Discussions, reviews, and activity feeds remain out of scope for this phase.
        </p>
      </div>
    </main>
  );
}
