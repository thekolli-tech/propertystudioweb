import { describe, expect, it } from 'vitest';

import { AppError } from '../../../common/errors/app-error';
import { addBillingPeriod, ACTIVE_SUBSCRIPTION_STATUSES } from '../billing.util';

describe('billing util', () => {
  it('adds monthly and yearly periods in UTC months', () => {
    const start = new Date('2026-01-15T10:00:00.000Z');
    expect(addBillingPeriod(start, 'MONTHLY').toISOString()).toBe('2026-02-15T10:00:00.000Z');
    expect(addBillingPeriod(start, 'YEARLY').toISOString()).toBe('2027-01-15T10:00:00.000Z');
  });

  it('exposes active subscription statuses for entitlement checks', () => {
    expect(ACTIVE_SUBSCRIPTION_STATUSES).toEqual(['TRIALING', 'ACTIVE']);
  });
});

describe('insufficient funds error shape', () => {
  it('uses CONFLICT with stable details code', () => {
    const error = new AppError('CONFLICT', 'Insufficient wallet balance.', {
      code: 'INSUFFICIENT_FUNDS',
      balanceMinor: '100',
      requiredMinor: '500',
    });
    expect(error.code).toBe('CONFLICT');
    expect(error.details).toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
  });
});
