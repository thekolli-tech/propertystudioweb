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
    throw new Error('INVALID_CURSOR');
  }
}

export function bigintToString(value: bigint | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function toDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function applyCreatedCursor(where: Record<string, unknown>, cursor?: string) {
  if (!cursor) return;
  const decoded = decodeCursor(cursor);
  where.OR = [
    { createdAt: { lt: decoded.createdAt } },
    { createdAt: decoded.createdAt, id: { lt: decoded.id } },
  ];
}

export function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function endOfTodayUtc(): Date {
  const start = startOfTodayUtc();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}
