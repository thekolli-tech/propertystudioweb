import { describe, expect, it } from 'vitest';

import { isPublicIdForKind } from './public-id';

describe('isPublicIdForKind', () => {
  it('accepts matching public IDs', () => {
    expect(isPublicIdForKind('PS-PROP-000001', 'property')).toBe(true);
    expect(isPublicIdForKind('PS-ORG-000042', 'organization')).toBe(true);
    expect(isPublicIdForKind('PS-USER-000007', 'user')).toBe(true);
  });

  it('rejects mismatched prefixes and invalid values', () => {
    expect(isPublicIdForKind('PS-ORG-000001', 'property')).toBe(false);
    expect(isPublicIdForKind('not-a-public-id', 'property')).toBe(false);
    expect(isPublicIdForKind('550e8400-e29b-41d4-a716-446655440000', 'organization')).toBe(false);
  });
});
