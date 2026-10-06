import type { IntelligenceDataState } from '@property-studio/contracts';
import { StatusBadge } from '@property-studio/ui';

const COVERAGE_LABEL: Record<IntelligenceDataState, string> = {
  READY: 'Ready',
  INSUFFICIENT_DATA: 'Insufficient data',
  UNAVAILABLE: 'Unavailable',
};

export function coverageTone(
  state: IntelligenceDataState,
): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (state) {
    case 'READY':
      return 'success';
    case 'INSUFFICIENT_DATA':
      return 'warning';
    case 'UNAVAILABLE':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function CoverageBadge({ state, label }: { state: IntelligenceDataState; label?: string }) {
  return (
    <StatusBadge tone={coverageTone(state)}>
      {label ? `${label}: ${COVERAGE_LABEL[state]}` : COVERAGE_LABEL[state]}
    </StatusBadge>
  );
}
