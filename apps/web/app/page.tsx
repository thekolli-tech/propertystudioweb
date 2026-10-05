import Link from 'next/link';
import { Button } from '@property-studio/ui';

import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';
import { getSessionUser } from '@/lib/auth';

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader authenticated={Boolean(user)} />
      <main className="ps-hero-surface relative flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,hsl(var(--background))_100%)]" />
        <div className="relative mx-auto flex min-h-[70vh] w-full max-w-7xl flex-col justify-center px-4 py-20 sm:px-6">
          <p className="text-sm font-medium tracking-[0.22em] text-primary uppercase">
            Property Studio
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl">
            Property intelligence for India
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Discover properties, follow communities, and run professional workflows — built for INR,
            Asia/Kolkata, and the Indian market.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={user ? '/app' : '/register'}>
                {user ? 'Open application' : 'Get started'}
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/properties">Browse properties</Link>
            </Button>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
