import { isValidPublicId, parsePublicId } from '@property-studio/public-id';

const PREFIX_BY_KIND = {
  property: 'PROP',
  project: 'PROJ',
  community: 'COM',
  developer: 'DEV',
  agent: 'AGT',
  organization: 'ORG',
  user: 'USER',
} as const;

export type PublicEntityKind = keyof typeof PREFIX_BY_KIND;

export function isPublicIdForKind(publicId: string, kind: PublicEntityKind): boolean {
  if (!isValidPublicId(publicId)) {
    return false;
  }
  try {
    return parsePublicId(publicId).prefix === PREFIX_BY_KIND[kind];
  } catch {
    return false;
  }
}
