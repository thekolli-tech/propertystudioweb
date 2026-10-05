/**
 * Permission and role catalogs.
 * Runtime grants assign roles; the permission catalog is code-owned and not editable at runtime.
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

export const ORGANIZATION_TYPES = ['DEVELOPER', 'AGENCY'] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

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
  'platform:users:manage',
  'organization:read',
  'organization:manage',
  'organization:members:manage',
  'project:read',
  'project:create',
  'project:update',
  'project:publish',
  'property:read',
  'property:create',
  'property:update',
  'property:publish',
  'community:read',
  'community:create',
  'community:update',
  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformRole, readonly Permission[]> = {
  SUPER_ADMIN: [...PERMISSIONS],
  ADMIN: [
    'platform:admin',
    'platform:users:manage',
    'organization:read',
    'organization:manage',
    'organization:members:manage',
    'project:read',
    'project:create',
    'project:update',
    'project:publish',
    'property:read',
    'property:create',
    'property:update',
    'property:publish',
    'community:read',
    'community:create',
    'community:update',
    'audit:read',
  ],
  PROPERTY_ADMIN: [
    'organization:read',
    'property:read',
    'property:create',
    'property:update',
    'property:publish',
  ],
  CONTENT_EDITOR: ['project:read', 'property:read', 'property:update', 'community:read'],
  MODERATOR: ['project:read', 'property:read', 'community:read', 'audit:read'],
};

export const ORGANIZATION_ROLE_PERMISSIONS: Record<OrganizationRole, readonly Permission[]> = {
  DEVELOPER: [
    'organization:read',
    'organization:manage',
    'organization:members:manage',
    'project:read',
    'project:create',
    'project:update',
    'project:publish',
    'property:read',
    'property:create',
    'property:update',
    'property:publish',
    'community:read',
    'community:create',
    'community:update',
  ],
  DEVELOPER_STAFF: [
    'organization:read',
    'project:read',
    'project:create',
    'project:update',
    'property:read',
    'property:create',
    'property:update',
    'community:read',
    'community:create',
    'community:update',
  ],
  // Agency roles: org management only in Phase 5. Catalog mutation is developer-owned.
  AGENT: ['organization:read', 'organization:manage', 'organization:members:manage'],
  AGENT_STAFF: ['organization:read'],
};

/** Organization roles allowed for each organization type. */
export const ORGANIZATION_TYPE_ROLES: Record<OrganizationType, readonly OrganizationRole[]> = {
  DEVELOPER: ['DEVELOPER', 'DEVELOPER_STAFF'],
  AGENCY: ['AGENT', 'AGENT_STAFF'],
};

export function roleHasPermission(role: PlatformRole, permission: Permission): boolean {
  return PLATFORM_ROLE_PERMISSIONS[role].includes(permission);
}

export function organizationRoleHasPermission(
  role: OrganizationRole,
  permission: Permission,
): boolean {
  return ORGANIZATION_ROLE_PERMISSIONS[role].includes(permission);
}

export function collectPermissions(input: {
  platformRoles: readonly PlatformRole[];
  organizationRole?: OrganizationRole | null;
}): Set<Permission> {
  const permissions = new Set<Permission>();
  for (const role of input.platformRoles) {
    for (const permission of PLATFORM_ROLE_PERMISSIONS[role]) {
      permissions.add(permission);
    }
  }
  if (input.organizationRole) {
    for (const permission of ORGANIZATION_ROLE_PERMISSIONS[input.organizationRole]) {
      permissions.add(permission);
    }
  }
  return permissions;
}

export function isPlatformRole(value: string): value is PlatformRole {
  return (PLATFORM_ROLES as readonly string[]).includes(value);
}

export function isOrganizationRole(value: string): value is OrganizationRole {
  return (ORGANIZATION_ROLES as readonly string[]).includes(value);
}

export function isPersona(value: string): value is Persona {
  return (PERSONAS as readonly string[]).includes(value);
}
