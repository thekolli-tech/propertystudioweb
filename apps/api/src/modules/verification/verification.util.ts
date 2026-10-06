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

export function oneYearFromNow(): Date {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date;
}

export function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  );
}
