import { describe, expect, it } from 'vitest';

import {
  collectPermissions,
  ORGANIZATION_TYPE_ROLES,
  PLATFORM_ROLES,
  roleHasPermission,
} from './index';

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

  it('maps organization types to allowed roles', () => {
    expect(ORGANIZATION_TYPE_ROLES.DEVELOPER).toContain('DEVELOPER');
    expect(ORGANIZATION_TYPE_ROLES.AGENCY).toContain('AGENT_STAFF');
  });

  it('collects permissions from platform and organization roles', () => {
    const permissions = collectPermissions({
      platformRoles: ['MODERATOR'],
      organizationRole: 'DEVELOPER',
    });
    expect(permissions.has('audit:read')).toBe(true);
    expect(permissions.has('organization:manage')).toBe(true);
  });
});
