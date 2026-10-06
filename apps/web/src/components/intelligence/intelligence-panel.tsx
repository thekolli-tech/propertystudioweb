import type {
  InfrastructureAssetSummary,
  IntelligenceDataState,
  MarketSnapshotSummary,
  ProjectIntelligenceDetail,
  PropertyIntelligenceDetail,
  TrustScoreResponse,
  TrustSubjectStatus,
} from '@property-studio/contracts';
import { EmptyState, PriceDisplay, StatusBadge } from '@property-studio/ui';

import { VerifiedBadge } from '@/components/verified-badge';

import { CoverageBadge } from './coverage-badge';

export type IntelligencePanelProps = {
  title?: string;
  unavailable?: boolean;
  unavailableMessage?: string;
  coverageState?: IntelligenceDataState;
  trustStatus?: TrustSubjectStatus;
  trustScore?: TrustScoreResponse | null;
  pricePerSqftMinor?: string | null;
  currency?: string;
  market?: MarketSnapshotSummary | null;
  marketCoverageState?: IntelligenceDataState;
  infrastructure?: InfrastructureAssetSummary[];
  infrastructureCoverageState?: IntelligenceDataState;
  disclaimer?: string;
};

function trustTone(status: TrustSubjectStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  switch (status) {
    case 'VERIFIED':
      return 'success';
    case 'PENDING_VERIFICATION':
      return 'warning';
    case 'FLAGGED':
    case 'REVOKED':
      return 'danger';
    case 'UNVERIFIED':
      return 'neutral';
    default:
      return 'info';
  }
}

export function IntelligencePanel({
  title = 'Intelligence',
  unavailable = false,
  unavailableMessage = 'Market intelligence is not available for this locality yet.',
  coverageState,
  trustStatus,
  trustScore,
  pricePerSqftMinor,
  currency = 'INR',
  market,
  marketCoverageState,
  infrastructure = [],
  infrastructureCoverageState,
  disclaimer,
}: IntelligencePanelProps) {
  if (unavailable || !coverageState) {
    return (
      <section className="space-y-3" aria-labelledby="intelligence-heading">
        <h2 id="intelligence-heading" className="font-display text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <EmptyState title="Intelligence unavailable" description={unavailableMessage} />
      </section>
    );
  }

  const marketReady = marketCoverageState === 'READY' && market;
  const infraReady = infrastructureCoverageState === 'READY';
  const hasPricePerSqft = Boolean(pricePerSqftMinor);

  return (
    <section className="space-y-4" aria-labelledby="intelligence-heading">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="intelligence-heading" className="font-display text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <CoverageBadge state={coverageState} label="Coverage" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Trust
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {trustStatus ? (
              <StatusBadge tone={trustTone(trustStatus)}>
                {trustStatus.replaceAll('_', ' ')}
              </StatusBadge>
            ) : (
              <span className="text-sm text-muted-foreground">Not available</span>
            )}
            <VerifiedBadge verified={trustScore?.verified === true} />
          </div>
          {trustScore?.state === 'READY' && trustScore.score != null ? (
            <p className="mt-2 text-sm">
              Score <span className="font-medium">{trustScore.score}</span>
              <span className="text-muted-foreground"> · {trustScore.reviewCount} reviews</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Insufficient verified data for a trust score.
            </p>
          )}
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Price / sqft
          </p>
          {hasPricePerSqft ? (
            <div className="mt-2">
              <PriceDisplay amountMinor={pricePerSqftMinor!} currency={currency} size="md" />
              <p className="mt-1 text-xs text-muted-foreground">From listing data when published.</p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Price per sqft is not available.</p>
          )}
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Market
            </p>
            {marketCoverageState ? <CoverageBadge state={marketCoverageState} /> : null}
          </div>
          {marketReady ? (
            <dl className="mt-3 space-y-2 text-sm">
              {market.medianPricePerSqftMinor ? (
                <div>
                  <dt className="text-muted-foreground">Median price / sqft</dt>
                  <dd className="font-medium">
                    <PriceDisplay
                      amountMinor={market.medianPricePerSqftMinor}
                      currency={market.currency}
                      size="sm"
                    />
                  </dd>
                </div>
              ) : null}
              {market.locality || market.city ? (
                <div>
                  <dt className="text-muted-foreground">Locality</dt>
                  <dd className="font-medium">
                    {[market.locality, market.city].filter(Boolean).join(', ')}
                  </dd>
                </div>
              ) : null}
              {market.inventorySignal ? (
                <div>
                  <dt className="text-muted-foreground">Inventory signal</dt>
                  <dd className="font-medium">{market.inventorySignal}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Market intelligence is not available for this locality yet.
            </p>
          )}
        </div>

        <div className="rounded-[var(--radius)] border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Infrastructure
            </p>
            {infrastructureCoverageState ? (
              <CoverageBadge state={infrastructureCoverageState} />
            ) : null}
          </div>
          {infraReady && infrastructure.length > 0 ? (
            <p className="mt-2 text-sm">
              <span className="font-medium">{infrastructure.length}</span>
              <span className="text-muted-foreground">
                {' '}
                nearby asset{infrastructure.length === 1 ? '' : 's'} on record
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Infrastructure data is not available for this locality yet.
            </p>
          )}
        </div>
      </div>

      {disclaimer ? <p className="text-xs text-muted-foreground">{disclaimer}</p> : null}
    </section>
  );
}

export function propertyIntelligenceToPanelProps(
  detail: PropertyIntelligenceDetail,
): IntelligencePanelProps {
  return {
    coverageState: detail.coverageState,
    trustStatus: detail.trustStatus,
    trustScore: detail.trustScore,
    pricePerSqftMinor: detail.pricePerSqftMinor,
    currency: detail.currency,
    market: detail.market,
    marketCoverageState: detail.marketCoverageState,
    infrastructure: detail.infrastructure,
    infrastructureCoverageState: detail.infrastructureCoverageState,
    disclaimer: detail.disclaimer,
  };
}

export function projectIntelligenceToPanelProps(
  detail: ProjectIntelligenceDetail,
): IntelligencePanelProps {
  return {
    coverageState: detail.coverageState,
    trustStatus: detail.trustStatus,
    trustScore: detail.trustScore,
    pricePerSqftMinor: detail.market?.medianPricePerSqftMinor ?? null,
    currency: detail.currency,
    market: detail.market,
    marketCoverageState: detail.marketCoverageState,
    infrastructure: detail.infrastructure,
    infrastructureCoverageState: detail.infrastructureCoverageState,
    disclaimer: detail.disclaimer,
  };
}
