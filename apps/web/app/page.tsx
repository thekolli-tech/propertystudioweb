import { createApiClient, ApiClientError } from '@property-studio/api-client';
import type { HealthResponse } from '@property-studio/contracts';
import { Button } from '@property-studio/ui';

export const dynamic = 'force-dynamic';

type HealthView = { state: 'ok'; data: HealthResponse } | { state: 'error'; message: string };

async function loadHealth(): Promise<HealthView> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    return {
      state: 'error',
      message: 'NEXT_PUBLIC_API_BASE_URL is not configured.',
    };
  }

  try {
    const client = createApiClient({ baseUrl });
    const data = await client.getHealth();
    return { state: 'ok', data };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { state: 'error', message: `${error.code}: ${error.message}` };
    }
    return {
      state: 'error',
      message: error instanceof Error ? error.message : 'Unable to reach the API.',
    };
  }
}

export default async function HomePage() {
  const health = await loadHealth();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#d9f1f7,_transparent_40%),radial-gradient(circle_at_bottom_right,_#f3e7d3,_#f7f4ee_55%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
        <p
          className="text-sm font-medium tracking-[0.24em] text-[hsl(var(--primary))] uppercase"
          style={{ fontFamily: 'var(--font-body), sans-serif' }}
        >
          Property Studio
        </p>
        <h1
          className="mt-4 max-w-3xl text-5xl leading-tight text-[hsl(var(--foreground))] md:text-6xl"
          style={{ fontFamily: 'var(--font-display), serif' }}
        >
          Platform skeleton
        </h1>
        <p
          className="mt-5 max-w-2xl text-lg text-[hsl(var(--muted-foreground))]"
          style={{ fontFamily: 'var(--font-body), sans-serif' }}
        >
          Phase 1 verifies monorepo tooling, API health, and the web placeholder. Product domains
          are intentionally deferred.
        </p>

        <section className="mt-10 max-w-xl border-t border-[hsl(var(--border))] pt-8">
          <h2
            className="text-sm font-semibold tracking-wide text-[hsl(var(--foreground))] uppercase"
            style={{ fontFamily: 'var(--font-body), sans-serif' }}
          >
            API health
          </h2>

          {health.state === 'ok' ? (
            <div className="mt-4 space-y-2" style={{ fontFamily: 'var(--font-body), sans-serif' }}>
              <p className="text-base text-[hsl(var(--foreground))]">
                Status: <span className="font-semibold text-emerald-700">{health.data.status}</span>
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Service: {health.data.service}
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Timestamp: {health.data.timestamp}
              </p>
            </div>
          ) : (
            <p
              className="mt-4 text-base text-red-700"
              style={{ fontFamily: 'var(--font-body), sans-serif' }}
            >
              {health.message}
            </p>
          )}

          <div className="mt-6">
            <Button type="button" disabled>
              Product UI deferred
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
