import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ps-hero-surface flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <p className="mb-8 text-center font-display text-2xl font-semibold tracking-tight text-foreground">
          Property Studio
        </p>
        {children}
      </div>
    </div>
  );
}
