import { type AuthActor, actorHasPermission } from '../../common/tenancy/access-scope';
import { AppError } from '../../common/errors/app-error';

export function requirePlatformAdmin(actor: AuthActor): void {
  if (!actor.userId) {
    throw new AppError('UNAUTHORIZED', 'Authentication required.');
  }
  if (
    actorHasPermission(actor, 'platform:admin') ||
    actor.platformRoles.includes('ADMIN') ||
    actor.platformRoles.includes('SUPER_ADMIN')
  ) {
    return;
  }
  throw new AppError('FORBIDDEN', 'Platform admin access required.');
}

export function requireAuditRead(actor: AuthActor): void {
  requirePlatformAdmin(actor);
  if (!actorHasPermission(actor, 'audit:read') && !actorHasPermission(actor, 'platform:admin')) {
    throw new AppError('FORBIDDEN', 'audit:read permission required.');
  }
}

export function requireAdminAiRead(actor: AuthActor): void {
  requirePlatformAdmin(actor);
  if (!actorHasPermission(actor, 'admin:ai:read') && !actorHasPermission(actor, 'platform:admin')) {
    throw new AppError('FORBIDDEN', 'admin:ai:read permission required.');
  }
}
