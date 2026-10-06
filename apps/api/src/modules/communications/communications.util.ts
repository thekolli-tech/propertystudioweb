export function encodeCursor(updatedAt: Date, id: string): string {
  return Buffer.from(`${updatedAt.toISOString()}|${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { updatedAt: Date; id: string } {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const [iso, id] = raw.split('|');
    if (!iso || !id) throw new Error('invalid');
    const updatedAt = new Date(iso);
    if (Number.isNaN(updatedAt.getTime())) throw new Error('invalid');
    return { updatedAt, id };
  } catch {
    throw new Error('INVALID_CURSOR');
  }
}

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function applyUpdatedCursor(where: Record<string, unknown>, cursor?: string) {
  if (!cursor) return;
  const decoded = decodeCursor(cursor);
  where.OR = [
    { updatedAt: { lt: decoded.updatedAt } },
    { updatedAt: decoded.updatedAt, id: { lt: decoded.id } },
  ];
}
