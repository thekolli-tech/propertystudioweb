import * as React from 'react';

import { cn } from '../lib/utils';

export type PriceDisplayProps = {
  amountMinor: string | number | bigint | null | undefined;
  currency?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  suffix?: string;
  emptyLabel?: string;
};

export function formatMoneyMinor(
  amountMinor: string | number | bigint | null | undefined,
  currency = 'INR',
): string | null {
  if (amountMinor === null || amountMinor === undefined || amountMinor === '') {
    return null;
  }
  const major = Number(amountMinor) / 100;
  if (!Number.isFinite(major)) {
    return null;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(major);
}

export function PriceDisplay({
  amountMinor,
  currency = 'INR',
  className,
  size = 'md',
  suffix,
  emptyLabel = 'Price on request',
}: PriceDisplayProps) {
  const formatted = formatMoneyMinor(amountMinor, currency);
  return (
    <span
      className={cn(
        'font-semibold tracking-tight text-foreground',
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-base',
        size === 'lg' && 'text-2xl',
        className,
      )}
    >
      {formatted ? (
        <>
          {formatted}
          {suffix ? <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span> : null}
        </>
      ) : (
        <span className="font-medium text-muted-foreground">{emptyLabel}</span>
      )}
    </span>
  );
}
