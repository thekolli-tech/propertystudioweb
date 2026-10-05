import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-foreground">Property Studio</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Property intelligence for India — listings, communities, and professional workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-sm">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Explore</p>
            <Link href="/properties" className="block text-muted-foreground hover:text-foreground">
              Properties
            </Link>
            <Link href="/media" className="block text-muted-foreground hover:text-foreground">
              Media
            </Link>
            <Link href="/about" className="block text-muted-foreground hover:text-foreground">
              About
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-foreground">Account</p>
            <Link href="/login" className="block text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link href="/register" className="block text-muted-foreground hover:text-foreground">
              Register
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border/70 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Property Studio · Market India · INR · Asia/Kolkata
      </div>
    </footer>
  );
}
