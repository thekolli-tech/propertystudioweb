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
  'requirement:create',
  'requirement:read:own',
  'requirement:update:own',
  'requirement:publish',
  'requirement:read:marketplace',
  'lead:read',
  'lead:update',
  'lead:assign',
  'admin:requirements:read',
  'admin:leads:read',
  'crm:read',
  'crm:contacts:read',
  'crm:contacts:create',
  'crm:contacts:update',
  'crm:leads:assign',
  'crm:leads:update',
  'crm:activities:create',
  'crm:activities:read',
  'crm:followups:create',
  'crm:followups:update',
  'crm:sitevisits:create',
  'crm:sitevisits:update',
  'crm:deals:create',
  'crm:deals:update',
  'subscriptions:read',
  'subscriptions:manage',
  'billing:read',
  'billing:manage',
  'wallet:read',
  'wallet:manage',
  'payments:read',
  'payments:manage',
  'invoices:read',
  'invoices:manage',
  'lead:purchases:create',
  'lead:purchases:read',
  'admin:billing:read',
  'admin:billing:manage',
  'verification:read',
  'verification:create',
  'verification:update',
  'verification:submit',
  'verification:documents:read',
  'verification:documents:create',
  'verification:documents:update',
  'verification:review',
  'verification:approve',
  'verification:reject',
  'verification:revoke',
  'reviews:read',
  'reviews:create',
  'reviews:update:own',
  'reviews:report',
  'reviews:moderate',
  'notifications:read',
  'notifications:update',
  'communications:read',
  'communications:create',
  'communications:message',
  'communications:moderate',
  'leads:access',
  'leads:contact:reveal',
  'admin:verification:read',
  'admin:verification:manage',
  'admin:reviews:read',
  'admin:reviews:manage',
  'admin:communications:moderate',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const REQUIREMENT_OWNER_PERMISSIONS = [
  'requirement:create',
  'requirement:read:own',
  'requirement:update:own',
  'requirement:publish',
] as const satisfies readonly Permission[];

const MARKETPLACE_PARTICIPANT_PERMISSIONS = [
  'requirement:read:marketplace',
  'lead:read',
  'lead:update',
] as const satisfies readonly Permission[];

const CRM_PERMISSIONS = [
  'crm:read',
  'crm:contacts:read',
  'crm:contacts:create',
  'crm:contacts:update',
  'crm:leads:assign',
  'crm:leads:update',
  'crm:activities:create',
  'crm:activities:read',
  'crm:followups:create',
  'crm:followups:update',
  'crm:sitevisits:create',
  'crm:sitevisits:update',
  'crm:deals:create',
  'crm:deals:update',
] as const satisfies readonly Permission[];

const BILLING_READ_PERMISSIONS = [
  'subscriptions:read',
  'billing:read',
  'wallet:read',
  'payments:read',
  'invoices:read',
  'lead:purchases:read',
] as const satisfies readonly Permission[];

const BILLING_MANAGE_PERMISSIONS = [
  'subscriptions:manage',
  'billing:manage',
  'wallet:manage',
  'payments:manage',
  'invoices:manage',
  'lead:purchases:create',
] as const satisfies readonly Permission[];

const VERIFICATION_ORG_OWNER_PERMISSIONS = [
  'verification:read',
  'verification:create',
  'verification:update',
  'verification:submit',
  'verification:documents:read',
  'verification:documents:create',
  'verification:documents:update',
] as const satisfies readonly Permission[];

const VERIFICATION_ORG_STAFF_PERMISSIONS = [
  'verification:read',
  'verification:documents:read',
] as const satisfies readonly Permission[];

const REVIEW_PARTICIPANT_PERMISSIONS = [
  'reviews:read',
  'reviews:create',
  'reviews:report',
] as const satisfies readonly Permission[];

const NOTIFICATION_PERMISSIONS = [
  'notifications:read',
  'notifications:update',
] as const satisfies readonly Permission[];

const COMMUNICATIONS_ORG_OWNER_PERMISSIONS = [
  'communications:read',
  'communications:create',
  'communications:message',
] as const satisfies readonly Permission[];

const COMMUNICATIONS_ORG_STAFF_PERMISSIONS = [
  'communications:read',
  'communications:message',
] as const satisfies readonly Permission[];

const LEAD_ACCESS_PERMISSIONS = [
  'leads:access',
  'leads:contact:reveal',
] as const satisfies readonly Permission[];

const PERSONA_PHASE10_PERMISSIONS = [
  'reviews:create',
  'reviews:read',
  'reviews:update:own',
  'reviews:report',
  ...NOTIFICATION_PERMISSIONS,
  'communications:read',
  'communications:create',
  'communications:message',
] as const satisfies readonly Permission[];

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
    'requirement:read:marketplace',
    'lead:read',
    'lead:update',
    'lead:assign',
    'admin:requirements:read',
    'admin:leads:read',
    ...CRM_PERMISSIONS,
    ...BILLING_READ_PERMISSIONS,
    ...BILLING_MANAGE_PERMISSIONS,
    'admin:billing:read',
    'admin:billing:manage',
    'admin:verification:read',
    'admin:verification:manage',
    'admin:reviews:read',
    'admin:reviews:manage',
    'reviews:read',
    'reviews:moderate',
    'verification:review',
    'verification:approve',
    'verification:reject',
    'verification:revoke',
    ...NOTIFICATION_PERMISSIONS,
    'communications:moderate',
    'admin:communications:moderate',
    ...LEAD_ACCESS_PERMISSIONS,
  ],
  PROPERTY_ADMIN: [
    'organization:read',
    'property:read',
    'property:create',
    'property:update',
    'property:publish',
  ],
  CONTENT_EDITOR: ['project:read', 'property:read', 'property:update', 'community:read'],
  MODERATOR: [
    'project:read',
    'property:read',
    'community:read',
    'audit:read',
    'reviews:read',
    'reviews:report',
    'reviews:moderate',
    'admin:reviews:read',
    'communications:moderate',
  ],
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
    ...MARKETPLACE_PARTICIPANT_PERMISSIONS,
    'lead:assign',
    ...CRM_PERMISSIONS,
    ...BILLING_READ_PERMISSIONS,
    ...BILLING_MANAGE_PERMISSIONS,
    ...VERIFICATION_ORG_OWNER_PERMISSIONS,
    ...REVIEW_PARTICIPANT_PERMISSIONS,
    ...NOTIFICATION_PERMISSIONS,
    ...COMMUNICATIONS_ORG_OWNER_PERMISSIONS,
    ...LEAD_ACCESS_PERMISSIONS,
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
    ...MARKETPLACE_PARTICIPANT_PERMISSIONS,
    ...CRM_PERMISSIONS,
    ...BILLING_READ_PERMISSIONS,
    ...VERIFICATION_ORG_STAFF_PERMISSIONS,
    ...REVIEW_PARTICIPANT_PERMISSIONS,
    ...NOTIFICATION_PERMISSIONS,
    ...COMMUNICATIONS_ORG_STAFF_PERMISSIONS,
    ...LEAD_ACCESS_PERMISSIONS,
  ],
  AGENT: [
    'organization:read',
    'organization:manage',
    'organization:members:manage',
    ...MARKETPLACE_PARTICIPANT_PERMISSIONS,
    'lead:assign',
    ...CRM_PERMISSIONS,
    ...BILLING_READ_PERMISSIONS,
    ...BILLING_MANAGE_PERMISSIONS,
    ...VERIFICATION_ORG_OWNER_PERMISSIONS,
    ...REVIEW_PARTICIPANT_PERMISSIONS,
    ...NOTIFICATION_PERMISSIONS,
    ...COMMUNICATIONS_ORG_OWNER_PERMISSIONS,
    ...LEAD_ACCESS_PERMISSIONS,
  ],
  AGENT_STAFF: [
    'organization:read',
    ...MARKETPLACE_PARTICIPANT_PERMISSIONS,
    ...CRM_PERMISSIONS,
    ...BILLING_READ_PERMISSIONS,
    ...VERIFICATION_ORG_STAFF_PERMISSIONS,
    ...REVIEW_PARTICIPANT_PERMISSIONS,
    ...NOTIFICATION_PERMISSIONS,
    ...COMMUNICATIONS_ORG_STAFF_PERMISSIONS,
    ...LEAD_ACCESS_PERMISSIONS,
  ],
};

/** Persona grants for demand-side requirement ownership (Phase 7) and Phase 10 trust/comms. */
export const PERSONA_PERMISSIONS: Partial<Record<Persona, readonly Permission[]>> = {
  PROPERTY_SEEKER: [...REQUIREMENT_OWNER_PERMISSIONS, ...PERSONA_PHASE10_PERMISSIONS],
  INVESTOR: [...REQUIREMENT_OWNER_PERMISSIONS, ...PERSONA_PHASE10_PERMISSIONS],
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
  personas?: readonly Persona[];
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
  for (const persona of input.personas ?? []) {
    for (const permission of PERSONA_PERMISSIONS[persona] ?? []) {
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
