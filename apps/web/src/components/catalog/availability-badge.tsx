import type { PropertyAvailabilityStatus } from '@property-studio/contracts';
import { StatusBadge } from '@property-studio/ui';

const AVAILABILITY_LABEL: Record<PropertyAvailabilityStatus, string> = {
  AVAILABLE: 'Available',
  UNDER_OFFER: 'Under offer',
  SOLD: 'Sold out',
  UNAVAILABLE: 'Unavailable',
};

const AVAILABILITY_TONE: Record<
  PropertyAvailabilityStatus,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  AVAILABLE: 'success',
  UNDER_OFFER: 'warning',
  SOLD: 'danger',
  UNAVAILABLE: 'neutral',
};

export type AvailabilityBadgeProps = {
  status: PropertyAvailabilityStatus | string;
  className?: string;
};

export function AvailabilityBadge({ status, className }: AvailabilityBadgeProps) {
  const known = status in AVAILABILITY_LABEL ? (status as PropertyAvailabilityStatus) : null;
  if (!known) {
    return (
      <StatusBadge tone="neutral" className={className}>
        {status.replaceAll('_', ' ')}
      </StatusBadge>
    );
  }
  return (
    <StatusBadge tone={AVAILABILITY_TONE[known]} className={className}>
      {AVAILABILITY_LABEL[known]}
    </StatusBadge>
  );
}
