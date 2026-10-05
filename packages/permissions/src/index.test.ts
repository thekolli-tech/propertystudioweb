import { describe, expect, it } from 'vitest';

import { PLATFORM_ROLES, roleHasPermission } from './index';

describe('permissions catalog', () => {
  it('includes SUPER_ADMIN and ADMIN', () => {
    expect(PLATFORM_ROLES).toContain('SUPER_ADMIN');
    expect(PLATFORM_ROLES).toContain('ADMIN');
  });

  it('grants platform:admin to SUPER_ADMIN', () => {
    expect(roleHasPermission('SUPER_ADMIN', 'platform:admin')).toBe(true);
  });

  it('does not grant platform:admin to CONTENT_EDITOR', () => {
    expect(roleHasPermission('CONTENT_EDITOR', 'platform:admin')).toBe(false);
  });
});
