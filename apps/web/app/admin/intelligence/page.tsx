export const dynamic = 'force-dynamic';

import { EmptyState, PageHeader, PriceDisplay, StatusBadge } from '@property-studio/ui';

import { CoverageBadge } from '@/components/intelligence/coverage-badge';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Admin intelligence' };

export default async function AdminIntelligencePage() {
  const cookie = await getRequestCookieHeader();
  const client = createServerApiClient(cookie);

  let marketUnavailable = false;
  let infraUnavailable = false;
  let observationsUnavailable = false;

  let market: Awaited<ReturnType<typeof client.listAdminMarketSnapshots>> | null = null;
  let infrastructure: Awaited<ReturnType<typeof client.listAdminInfrastructure>> | null = null;
  let observations: Awaited<ReturnType<typeof client.listAdminIntelligenceObservations>> | null =
    null;

  try {
    market = await client.listAdminMarketSnapshots({ limit: 25 });
  } catch {
    marketUnavailable = true;
  }

  try {
    infrastructure = await client.listAdminInfrastructure({ limit: 25 });
  } catch {
    infraUnavailable = true;
  }

  try {
    observations = await client.listAdminIntelligenceObservations({ limit: 25 });
  } catch {
    observationsUnavailable = true;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Intelligence"
        description="Admin market snapshots, infrastructure assets, and observations. Empty when no verified data is loaded."
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Market snapshots</h2>
          {market ? <CoverageBadge state={market.coverageState} /> : null}
        </div>
        {marketUnavailable || !market ? (
          <EmptyState
            title="Market data unavailable"
            description="Admin market snapshot API could not be loaded for this session."
          />
        ) : market.snapshots.length === 0 ? (
          <EmptyState
            title="No market snapshots"
            description="Market intelligence is not available for this locality yet."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Locality</th>
                  <th className="px-4 py-3 font-medium">Median / sqft</th>
                  <th className="px-4 py-3 font-medium">Coverage</th>
                  <th className="px-4 py-3 font-medium">Observed</th>
                </tr>
              </thead>
              <tbody>
                {market.snapshots.map((row) => (
                  <tr key={row.publicId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.subjectKey}</div>
                      <div className="text-xs text-muted-foreground">{row.publicId}</div>
                    </td>
                    <td className="px-4 py-3">
                      {[row.locality, row.city].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <PriceDisplay
                        amountMinor={row.medianPricePerSqftMinor}
                        currency={row.currency}
                        size="sm"
                        emptyLabel="—"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <CoverageBadge state={row.coverageState} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(row.observedAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Infrastructure</h2>
          {infrastructure ? <CoverageBadge state={infrastructure.coverageState} /> : null}
        </div>
        {infraUnavailable || !infrastructure ? (
          <EmptyState
            title="Infrastructure unavailable"
            description="Admin infrastructure API could not be loaded for this session."
          />
        ) : infrastructure.assets.length === 0 ? (
          <EmptyState
            title="No infrastructure assets"
            description="Infrastructure data is not available for this locality yet."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Locality</th>
                </tr>
              </thead>
              <tbody>
                {infrastructure.assets.map((asset) => (
                  <tr key={asset.publicId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{asset.name}</div>
                      <div className="text-xs text-muted-foreground">{asset.publicId}</div>
                    </td>
                    <td className="px-4 py-3">{asset.category.replaceAll('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone="neutral">{asset.status.replaceAll('_', ' ')}</StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      {[asset.locality, asset.city].filter(Boolean).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-semibold tracking-tight">Observations</h2>
          {observations ? <CoverageBadge state={observations.coverageState} /> : null}
        </div>
        {observationsUnavailable || !observations ? (
          <EmptyState
            title="Observations unavailable"
            description="Admin observations API could not be loaded for this session."
          />
        ) : observations.observations.length === 0 ? (
          <EmptyState
            title="No observations"
            description="Intelligence observations appear here when recorded."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Coverage</th>
                  <th className="px-4 py-3 font-medium">Observed</th>
                </tr>
              </thead>
              <tbody>
                {observations.observations.map((row) => (
                  <tr key={row.publicId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{row.observationKey}</td>
                    <td className="px-4 py-3">
                      {row.subjectType} · {row.subjectKey}
                    </td>
                    <td className="px-4 py-3">
                      <CoverageBadge state={row.coverageState} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(row.observedAt).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
