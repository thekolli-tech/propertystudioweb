export const dynamic = 'force-dynamic';

import { ChartContainer, EmptyState, PageHeader, PriceDisplay } from '@property-studio/ui';

import { CoverageBadge } from '@/components/intelligence/coverage-badge';
import { createServerApiClient } from '@/lib/api';
import { getRequestCookieHeader } from '@/lib/auth';

export const metadata = { title: 'Studio · Market Intelligence' };

export default async function StudioMarketPage() {
  const cookie = await getRequestCookieHeader();
  let unavailable = false;
  let market: Awaited<
    ReturnType<ReturnType<typeof createServerApiClient>['listMarketSnapshots']>
  > | null = null;

  try {
    market = await createServerApiClient(cookie).listMarketSnapshots({ limit: 24 });
  } catch {
    unavailable = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Market Intelligence"
        description="Broadcast market view. Snapshots and trends appear only when verified data exists — never fabricated charts."
      />

      <ChartContainer
        title="Market coverage"
        description="Live snapshot count from the intelligence API."
        className="ps-broadcast-chart border-2"
        unavailable={unavailable || !market}
      >
        {market ? (
          <div className="flex flex-wrap items-center gap-3">
            <CoverageBadge state={market.coverageState} label="Coverage" />
            <p className="text-[calc(0.95rem*var(--broadcast-scale))]">
              <span className="font-medium">{market.snapshots.length}</span>
              <span className="text-muted-foreground"> snapshot(s) loaded</span>
            </p>
          </div>
        ) : null}
      </ChartContainer>

      {unavailable || !market ? (
        <EmptyState
          title="Market data unavailable"
          description="Market intelligence could not be loaded for this session."
        />
      ) : market.snapshots.length === 0 ? (
        <EmptyState
          title="No market snapshots"
          description="Market intelligence is not available for this locality yet."
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border-2 border-border">
          <table className="min-w-full text-left text-[calc(0.9rem*var(--broadcast-scale))]">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Locality</th>
                <th className="px-4 py-3 font-medium">Median / sqft</th>
                <th className="px-4 py-3 font-medium">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {market.snapshots.map((row) => (
                <tr key={row.publicId} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{row.subjectKey}</td>
                  <td className="px-4 py-3">
                    {[row.locality, row.city].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {row.medianPricePerSqftMinor ? (
                      <PriceDisplay
                        amountMinor={row.medianPricePerSqftMinor}
                        currency={row.currency}
                        size="sm"
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <CoverageBadge state={row.coverageState} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
