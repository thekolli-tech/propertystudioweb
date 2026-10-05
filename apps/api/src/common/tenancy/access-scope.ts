import {
  type OrganizationRole,
  type Permission,
  type Persona,
  type PlatformRole,
  collectPermissions,
} from '@property-studio/permissions';

export type AccessScope =
  | { type: 'platform' }
  | { type: 'organization'; organizationId: string }
  | { type: 'user'; userId: string };

export type AuthActor = {
  userId: string;
  userPublicId: string;
  email: string;
  sessionId: string;
  platformRoles: PlatformRole[];
  personas: Persona[];
  activeOrganizationId: string | null;
  activeOrganizationPublicId: string | null;
  organizationRole: OrganizationRole | null;
  permissions: Set<Permission>;
};

export function buildActorPermissions(input: {
  platformRoles: PlatformRole[];
  organizationRole?: OrganizationRole | null;
}): Set<Permission> {
  return collectPermissions(input);
}

export function actorHasPermission(actor: AuthActor, permission: Permission): boolean {
  return actor.permissions.has(permission);
}

export function resolveAccessScope(actor: AuthActor): AccessScope {
  if (actor.activeOrganizationId) {
    return { type: 'organization', organizationId: actor.activeOrganizationId };
  }
  return { type: 'user', userId: actor.userId };
}

/**
 * Ensures organization-owned queries always include organizationId.
 * Throws if a caller attempts an unscoped organization query.
 */
export function requireOrganizationScope(
  scope: AccessScope,
  organizationId: string,
): { organizationId: string } {
  if (scope.type === 'platform') {
    return { organizationId };
  }
  if (scope.type !== 'organization' || scope.organizationId !== organizationId) {
    throw new Error('TENANT_SCOPE_VIOLATION');
  }
  return { organizationId: scope.organizationId };
}

export function requireUserScope(scope: AccessScope, userId: string): { ownerUserId: string } {
  if (scope.type === 'platform') {
    return { ownerUserId: userId };
  }
  if (scope.type !== 'user' || scope.userId !== userId) {
    throw new Error('TENANT_SCOPE_VIOLATION');
  }
  return { ownerUserId: scope.userId };
}
