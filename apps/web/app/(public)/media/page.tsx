export const dynamic = 'force-dynamic';

import { Badge, EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Media' };

export default function MediaPage() {
  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        title="Media"
        description="Public media discovery uses existing media metadata. No invented galleries."
      />
      <EmptyState
        title="No public media collections yet"
        description="When projects and properties publish public media assets, they will appear here from live records."
      />
      <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        <Badge variant="outline">Object storage foundation</Badge>
        <p className="mt-2">
          Signed delivery and a full media CMS remain deferred. This UI never hardcodes property
          photography.
        </p>
      </div>
    </main>
  );
}
