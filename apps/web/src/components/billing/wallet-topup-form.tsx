'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button, Input, Label } from '@property-studio/ui';

import { createBrowserApiClient } from '@/lib/api';

export function WalletTopUpForm({ orgPublicId }: { orgPublicId: string }) {
  const router = useRouter();
  const [amountRupees, setAmountRupees] = useState('500');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const rupees = Number(amountRupees);
      if (!Number.isFinite(rupees) || rupees <= 0) {
        throw new Error('Enter a positive amount in rupees.');
      }
      const amountMinor = BigInt(Math.round(rupees * 100));
      const client = createBrowserApiClient();
      await client.topUpWallet({
        organizationPublicId: orgPublicId,
        amountMinor,
        currency: 'INR',
        idempotencyKey: `web-topup-${orgPublicId}-${Date.now()}`,
        description: 'Sandbox wallet top-up',
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Top-up failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="topup-amount">Amount (INR)</Label>
        <Input
          id="topup-amount"
          type="number"
          min={1}
          step={1}
          value={amountRupees}
          onChange={(event) => setAmountRupees(event.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Processing…' : 'Top up (sandbox)'}
      </Button>
    </form>
  );
}
