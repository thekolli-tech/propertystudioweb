import { type AdminAnalyticsPeriod } from '@property-studio/contracts';

import { AppError } from '../../common/errors/app-error';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** Midnight Asia/Kolkata expressed as a UTC Date. */
export function startOfDayIst(reference = new Date()): Date {
  const ist = new Date(reference.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth();
  const day = ist.getUTCDate();
  return new Date(Date.UTC(year, month, day) - IST_OFFSET_MS);
}

export type ResolvedAdminPeriod = {
  period: AdminAnalyticsPeriod;
  start: Date;
  end: Date;
  timezone: 'Asia/Kolkata';
};

export function resolveAdminPeriod(input: {
  period?: AdminAnalyticsPeriod;
  from?: string;
  to?: string;
}): ResolvedAdminPeriod {
  const period = input.period ?? 'DAYS_30';
  const end = new Date();

  if (period === 'CUSTOM') {
    if (!input.from || !input.to) {
      throw new AppError('VALIDATION_ERROR', 'Custom period requires from and to datetimes.');
    }
    const start = new Date(input.from);
    const customEnd = new Date(input.to);
    if (Number.isNaN(start.getTime()) || Number.isNaN(customEnd.getTime()) || start > customEnd) {
      throw new AppError('VALIDATION_ERROR', 'Invalid custom date range.');
    }
    return { period, start, end: customEnd, timezone: 'Asia/Kolkata' };
  }

  if (period === 'TODAY') {
    return { period, start: startOfDayIst(end), end, timezone: 'Asia/Kolkata' };
  }

  const days = period === 'DAYS_7' ? 7 : period === 'DAYS_90' ? 90 : 30;
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { period, start, end, timezone: 'Asia/Kolkata' };
}
