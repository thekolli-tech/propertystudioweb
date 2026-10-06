export function bigintToString(value: bigint | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return value.toString();
}

export function decimalToNumber(value: { toString(): string } | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Number(value.toString());
}

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

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
    throw new Error('INVALID_CURSOR');
  }
}

export function applyCreatedCursor(
  cursor: string | undefined,
): { createdAt: { lt: Date } } | { OR: Array<Record<string, unknown>> } | Record<string, never> {
  if (!cursor) {
    return {};
  }
  const decoded = decodeCursor(cursor);
  return {
    OR: [
      { createdAt: { lt: decoded.createdAt } },
      { createdAt: decoded.createdAt, id: { lt: decoded.id } },
    ],
  };
}

export const INTELLIGENCE_DISCLAIMER =
  'Informational only. Market and infrastructure signals may be incomplete and are not a valuation, guarantee, or investment advice.';

export function pricePerSqftMinor(
  priceMinor: bigint | null | undefined,
  areaSqft: number | null | undefined,
): string | null {
  if (priceMinor === null || priceMinor === undefined || !areaSqft || areaSqft <= 0) {
    return null;
  }
  return BigInt(Math.round(Number(priceMinor) / areaSqft)).toString();
}
