import Link from 'next/link';
import { Button, EmptyState, PageHeader } from '@property-studio/ui';

export const metadata = { title: 'Requirements' };

export default function PublicRequirementsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Requirements"
        description="Share what you are looking for. Requirement workflows arrive in a later phase."
        actions={
          <Button asChild>
            <Link href="/register">Create account</Link>
          </Button>
        }
      />
      <EmptyState
        title="Requirement posting coming soon"
        description="Authenticated requirement management will be available in the application shell."
      />
    </main>
  );
}
