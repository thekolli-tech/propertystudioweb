'use client';

import Link from 'next/link';
import { Button, ErrorState } from '@property-studio/ui';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-IN">
      <body>
        <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4">
          <ErrorState
            title="Unexpected error"
            message={error.message || 'An unexpected error occurred.'}
            onRetry={reset}
            className="w-full"
          />
          <div className="sr-only">
            <Button asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </main>
      </body>
    </html>
  );
}
