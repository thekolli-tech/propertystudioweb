'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AgentProfessionalStatus } from '@property-studio/contracts';
import { Button, StatusBadge } from '@property-studio/ui';

import { VerifiedBadge } from '@/components/verified-badge';
import { createBrowserApiClient } from '@/lib/api';

export type AgentWorkspaceBannerProps = {
  orgPublicId: string;
  status: AgentProfessionalStatus;
};

function renewalTone(
  renewal: AgentProfessionalStatus['renewalStatus'],
): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (renewal) {
    case 'ACTIVE':
      return 'success';
    case 'EXPIRING_SOON':
      return 'warning';
    case 'EXPIRED':
    case 'SUSPENDED':
      return 'danger';
    default:
      return 'neutral';
  }
}

function feeTone(
  fee: AgentProfessionalStatus['processingFeeStatus'],
): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (fee) {
    case 'PAID':
    case 'WAIVED':
      return 'success';
    case 'PENDING':
      return 'info';
    case 'REQUIRED':
      return 'warning';
    case 'FAILED':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function AgentWorkspaceBanner({ orgPublicId, status }: AgentWorkspaceBannerProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsFee =
    status.processingFeeStatus === 'REQUIRED' || status.processingFeeStatus === 'FAILED';
  const canPayFee = needsFee && Boolean(status.activeVerificationCasePublicId);
  const listingsLocked = !status.listingAccess;

  async function payFee() {
    if (!status.activeVerificationCasePublicId) return;
    setError(null);
    setPending(true);
    try {
      const client = createBrowserApiClient();
      await client.payAgentVerificationFee({
        organizationPublicId: orgPublicId,
        verificationCasePublicId: status.activeVerificationCasePublicId,
        idempotencyKey: `web-agent-fee-${orgPublicId}-${status.activeVerificationCasePublicId}-${Date.now()}`,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pay processing fee.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card px-4 py-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <VerifiedBadge verified={status.verifiedBadge} label="Verified Expert" />
        {!status.verifiedBadge ? (
          <StatusBadge tone="neutral">{status.verificationStatus}</StatusBadge>
        ) : null}
        <StatusBadge tone={renewalTone(status.renewalStatus)}>
          Renewal · {status.renewalStatus.replaceAll('_', ' ')}
        </StatusBadge>
        {status.processingFeeStatus ? (
          <StatusBadge tone={feeTone(status.processingFeeStatus)}>
            Fee · {status.processingFeeStatus}
          </StatusBadge>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
        <span>
          Professional access:{' '}
          <span className="font-medium text-foreground">
            {status.professionalAccess ? 'Yes' : 'No'}
          </span>
        </span>
        <span>
          Listings:{' '}
          <span className="font-medium text-foreground">
            {status.listingAccess ? 'Unlocked' : 'Locked'}
          </span>
        </span>
        <span>
          Marketplace:{' '}
          <span className="font-medium text-foreground">
            {status.marketplaceAccess ? 'Eligible' : 'Blocked'}
          </span>
        </span>
        {status.verificationExpiresAt ? (
          <span>
            Expires:{' '}
            <span className="font-medium text-foreground">
              {new Date(status.verificationExpiresAt).toLocaleDateString('en-IN')}
            </span>
          </span>
        ) : null}
      </div>

      {listingsLocked ? (
        <p className="text-muted-foreground">
          Listings stay locked until Verified Expert status is approved. Complete verification and
          pay the processing fee when required.
        </p>
      ) : null}

      {error ? <p className="text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {canPayFee ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => void payFee()}>
            {pending ? 'Processing…' : 'Pay verification processing fee'}
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline">
          <Link href={`/app/org/${orgPublicId}/verification`}>Open verification</Link>
        </Button>
      </div>
    </div>
  );
}
