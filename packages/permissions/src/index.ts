/**
 * Permission and role catalogs.
 * Runtime grants are stored later; the catalog is code-owned.
 */

export const PLATFORM_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'PROPERTY_ADMIN',
  'CONTENT_EDITOR',
  'MODERATOR',
] as const;

export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const ORGANIZATION_ROLES = ['DEVELOPER', 'DEVELOPER_STAFF', 'AGENT', 'AGENT_STAFF'] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export const PERSONAS = [
  'PROPERTY_SEEKER',
  'INVESTOR',
  'PROPERTY_OWNER',
  'LAND_OWNER',
  'BUILDER',
  'LEGAL_VERIFIER',
  'VALUATION_EXPERT',
] as const;

export type Persona = (typeof PERSONAS)[number];

export const PERMISSIONS = [
  'platform:admin',
  'organization:read',
  'organization:manage',
  'property:read',
  'property:create',
  'property:update',
  'property:publish',
  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, readonly Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  ADMIN: [
    'platform:admin',
    'organization:read',
    'organization:manage',
    'property:read',
    'property:create',
    'property:update',
    'property:publish',
    'audit:read',
  ],
  PROPERTY_ADMIN: [
    'organization:read',
    'property:read',
    'property:create',
    'property:update',
    'property:publish',
  ],
  CONTENT_EDITOR: ['property:read', 'property:update'],
  MODERATOR: ['property:read', 'audit:read'],
};

export function roleHasPermission(role: PlatformRole, permission: Permission): boolean {
  return PLATFORM_ROLE_PERMISSIONS[role].includes(permission);
}
