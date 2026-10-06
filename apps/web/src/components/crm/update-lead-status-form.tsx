'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { LeadStatus } from '@property-studio/contracts';
import { Button, ErrorState } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';
import { formatCrmLabel, nextCrmLeadStatuses } from './lead-status-transitions';

export function UpdateLeadStatusForm({
  organizationPublicId,
  leadPublicId,
  status,
  expectedVersion,
}: {
  organizationPublicId: string;
  leadPublicId: string;
  status: LeadStatus;
  expectedVersion: number;
}) {
  const router = useRouter();
  const options = nextCrmLeadStatuses(status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">No further status transitions.</p>;
  }

  async function update(next: LeadStatus) {
    setPending(true);
    setError(null);
    try {
      const client = createBrowserApiClient();
      await client.updateCrmLeadStatus(leadPublicId, {
        organizationPublicId,
        status: next,
        expectedVersion,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to update status.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => update(option)}
          >
            Mark {formatCrmLabel(option)}
          </Button>
        ))}
      </div>
      {error ? <ErrorState title="Status update failed" message={error} /> : null}
    </div>
  );
}
