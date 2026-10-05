import Link from 'next/link';
import { Button, EmptyState } from '@property-studio/ui';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-4 py-16">
      <EmptyState
        title="Page not found"
        description="The page you requested does not exist or is no longer available."
        action={
          <Button asChild variant="outline">
            <Link href="/">Return home</Link>
          </Button>
        }
        className="w-full"
      />
    </main>
  );
}
