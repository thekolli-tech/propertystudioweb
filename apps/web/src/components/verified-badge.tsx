import { Badge } from '@property-studio/ui';
import { BadgeCheck } from 'lucide-react';

export type VerifiedBadgeProps = {
  verified: boolean;
  label?: string;
  className?: string;
};

export function VerifiedBadge({ verified, label = 'Verified', className }: VerifiedBadgeProps) {
  if (!verified) return null;
  return (
    <Badge variant="success" className={className}>
      <BadgeCheck className="mr-1 h-3.5 w-3.5" aria-hidden />
      {label}
    </Badge>
  );
}
