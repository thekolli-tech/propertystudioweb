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

  it('grants requirement ownership permissions to seeker personas', () => {
    const permissions = collectPermissions({
      platformRoles: [],
      personas: ['PROPERTY_SEEKER'],
    });
    expect(permissions.has('requirement:create')).toBe(true);
    expect(permissions.has('requirement:publish')).toBe(true);
    expect(permissions.has('lead:read')).toBe(false);
  });

  it('grants marketplace lead permissions to developer org roles', () => {
    const permissions = collectPermissions({
      platformRoles: [],
      organizationRole: 'DEVELOPER',
    });
    expect(permissions.has('requirement:read:marketplace')).toBe(true);
    expect(permissions.has('lead:read')).toBe(true);
    expect(permissions.has('lead:assign')).toBe(true);
  });

  it('does not grant marketplace permissions to PROPERTY_ADMIN', () => {
    const permissions = collectPermissions({
      platformRoles: ['PROPERTY_ADMIN'],
    });
    expect(permissions.has('requirement:read:marketplace')).toBe(false);
    expect(permissions.has('lead:read')).toBe(false);
    expect(permissions.has('admin:requirements:read')).toBe(false);
    expect(permissions.has('crm:read')).toBe(false);
  });

  it('grants CRM permissions to developer and agent org roles', () => {
    const developer = collectPermissions({
      platformRoles: [],
      organizationRole: 'DEVELOPER',
    });
    expect(developer.has('crm:read')).toBe(true);
    expect(developer.has('crm:leads:assign')).toBe(true);
    expect(developer.has('crm:deals:create')).toBe(true);

    const staff = collectPermissions({
      platformRoles: [],
      organizationRole: 'AGENT_STAFF',
    });
    expect(staff.has('crm:contacts:create')).toBe(true);
    expect(staff.has('crm:followups:update')).toBe(true);
  });

  it('grants billing permissions to org owners but not PROPERTY_ADMIN', () => {
    const developer = collectPermissions({
      platformRoles: [],
      organizationRole: 'DEVELOPER',
    });
    expect(developer.has('billing:read')).toBe(true);
    expect(developer.has('wallet:manage')).toBe(true);
    expect(developer.has('lead:purchases:create')).toBe(true);

    const staff = collectPermissions({
      platformRoles: [],
      organizationRole: 'DEVELOPER_STAFF',
    });
    expect(staff.has('billing:read')).toBe(true);
    expect(staff.has('wallet:manage')).toBe(false);

    const propertyAdmin = collectPermissions({
      platformRoles: ['PROPERTY_ADMIN'],
    });
    expect(propertyAdmin.has('billing:read')).toBe(false);
    expect(propertyAdmin.has('admin:billing:read')).toBe(false);
  });

  it('grants Phase 11 intelligence and AI permissions by role', () => {
    const admin = collectPermissions({ platformRoles: ['ADMIN'] });
    expect(admin.has('intelligence:read')).toBe(true);
    expect(admin.has('admin:intelligence:manage')).toBe(true);
    expect(admin.has('ai:assistant')).toBe(true);
    expect(admin.has('admin:ai:read')).toBe(true);

    const developer = collectPermissions({
      platformRoles: [],
      organizationRole: 'DEVELOPER',
    });
    expect(developer.has('intelligence:compare')).toBe(true);
    expect(developer.has('ai:match')).toBe(true);
    expect(developer.has('ai:document:analyze')).toBe(true);
    expect(developer.has('admin:intelligence:read')).toBe(false);

    const staff = collectPermissions({
      platformRoles: [],
      organizationRole: 'DEVELOPER_STAFF',
    });
    expect(staff.has('intelligence:read')).toBe(true);
    expect(staff.has('ai:assistant')).toBe(true);
    expect(staff.has('ai:match')).toBe(false);
    expect(staff.has('intelligence:compare')).toBe(false);

    const seeker = collectPermissions({
      platformRoles: [],
      personas: ['PROPERTY_SEEKER'],
    });
    expect(seeker.has('intelligence:match')).toBe(true);
    expect(seeker.has('ai:valuation')).toBe(true);
    expect(seeker.has('ai:document:analyze')).toBe(false);

    const propertyAdmin = collectPermissions({
      platformRoles: ['PROPERTY_ADMIN'],
    });
    expect(propertyAdmin.has('intelligence:read')).toBe(false);
    expect(propertyAdmin.has('admin:ai:manage')).toBe(false);

    const moderator = collectPermissions({ platformRoles: ['MODERATOR'] });
    expect(moderator.has('intelligence:read')).toBe(true);
    expect(moderator.has('ai:assistant')).toBe(false);
  });
});
