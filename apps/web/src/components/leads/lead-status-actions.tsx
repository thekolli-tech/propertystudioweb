'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@property-studio/ui';
import type { LeadSummary } from '@property-studio/contracts';

import { createBrowserApiClient } from '@/lib/api';

const NEXT_STATUSES: Partial<Record<LeadSummary['status'], LeadSummary['status'][]>> = {
  NEW: ['VIEWED', 'CONTACTED'],
  ASSIGNED: ['VIEWED', 'CONTACTED'],
  VIEWED: ['CONTACTED', 'QUALIFIED'],
  CONTACTED: ['QUALIFIED', 'SITE_VISIT'],
  QUALIFIED: ['SITE_VISIT', 'NEGOTIATION'],
  SITE_VISIT: ['NEGOTIATION', 'BOOKED', 'LOST'],
  NEGOTIATION: ['BOOKED', 'LOST', 'CLOSED'],
};

export function LeadStatusActions({
  publicId,
  status,
}: {
  publicId: string;
  status: LeadSummary['status'];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const options = NEXT_STATUSES[status] ?? [];

  if (options.length === 0) return null;

  async function update(next: LeadSummary['status']) {
    setPending(true);
    try {
      const client = createBrowserApiClient();
      await client.updateLeadStatus(publicId, { status: next });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
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
          Mark {option.replace(/_/g, ' ').toLowerCase()}
        </Button>
      ))}
    </div>
  );
}
