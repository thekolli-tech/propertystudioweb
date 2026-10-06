import { AppError } from '../../common/errors/app-error';

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const [iso, id] = raw.split('|');
    if (!iso || !id) throw new Error('invalid');
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime())) throw new Error('invalid');
    return { createdAt, id };
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
  }
}

export function bigintToString(value: bigint | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return value.toString();
}

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function applyCreatedCursor(where: Record<string, unknown>, cursor?: string) {
  if (!cursor) return;
  const decoded = decodeCursor(cursor);
  where.OR = [
    { createdAt: { lt: decoded.createdAt } },
    { createdAt: decoded.createdAt, id: { lt: decoded.id } },
  ];
}

export function addBillingPeriod(start: Date, interval: 'MONTHLY' | 'YEARLY'): Date {
  const end = new Date(start);
  if (interval === 'YEARLY') {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1);
  }
  return end;
}

export const ACTIVE_SUBSCRIPTION_STATUSES = ['TRIALING', 'ACTIVE'] as const;
