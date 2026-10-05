import { EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Media' };

export default function MediaPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Media"
        description="Editorial and market media surface. Content publishing arrives in a later phase."
      />
      <EmptyState
        title="No media published yet"
        description="Media stories and market briefings will appear here when available."
      />
    </main>
  );
}
