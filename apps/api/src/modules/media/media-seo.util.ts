import { type SeoMetadata } from '@property-studio/contracts';

export type SeoInput = {
  title?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalPath?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  indexable?: boolean | null;
  visibility?: 'PUBLIC' | 'PRIVATE' | string | null;
  fallbackPath?: string | null;
};

/**
 * Builds SEO metadata for API responses.
 * Private (or non-indexable) content is never indexable.
 */
export function buildSeoMetadata(input: SeoInput): SeoMetadata {
  // Private content is never indexable; callers pass the effective indexable flag.
  const indexable = input.visibility === 'PRIVATE' ? false : input.indexable === true;

  if (!indexable) {
    return {
      seoTitle: null,
      seoDescription: null,
      canonicalPath: null,
      ogTitle: null,
      ogDescription: null,
      twitterTitle: null,
      twitterDescription: null,
      indexable: false,
    };
  }

  const seoTitle = input.seoTitle ?? input.title ?? null;
  const seoDescription = input.seoDescription ?? input.description ?? null;

  return {
    seoTitle,
    seoDescription,
    canonicalPath: input.canonicalPath ?? input.fallbackPath ?? null,
    ogTitle: input.ogTitle ?? seoTitle,
    ogDescription: input.ogDescription ?? seoDescription,
    twitterTitle: input.twitterTitle ?? input.ogTitle ?? seoTitle,
    twitterDescription: input.twitterDescription ?? input.ogDescription ?? seoDescription,
    indexable: true,
  };
}

export function resolveIndexable(
  visibility: string | null | undefined,
  requested?: boolean | null,
): boolean {
  if (visibility !== 'PUBLIC') {
    return false;
  }
  return requested === true;
}

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
  return slug.length >= 2 ? slug : `item-${Date.now().toString(36)}`;
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

export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

export function applyCreatedCursor<T extends Record<string, unknown>>(
  where: T,
  cursor: string | undefined,
): T {
  if (!cursor) {
    return where;
  }
  const { createdAt, id } = decodeCursor(cursor);
  return {
    ...where,
    AND: [
      ...((where as { AND?: unknown[] }).AND ?? []),
      {
        OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: id } }],
      },
    ],
  };
}
