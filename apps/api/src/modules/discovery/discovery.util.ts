import { AppError } from '../../common/errors/app-error';

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const [iso, id] = raw.split('|');
    if (!iso || !id) {
      throw new Error('invalid');
    }
    const createdAt = new Date(iso);
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error('invalid');
    }
    return { createdAt, id };
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Invalid cursor.');
  }
}

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function coerceMinor(value: bigint | string | number | undefined): bigint | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'bigint') return value;
  return BigInt(value);
}
