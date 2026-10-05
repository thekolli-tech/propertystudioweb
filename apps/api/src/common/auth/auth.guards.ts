import { type CanActivate, type ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Permission } from '@property-studio/permissions';

import { AppError } from '../errors/app-error';
import { actorHasPermission } from '../tenancy/access-scope';
import { type AuthenticatedRequest } from './current-actor.decorator';
import { SessionService } from './session.service';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const actor = await this.sessions.resolveActorFromRequest(request);
    if (!actor) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.');
    }
    request.actor = actor;
    return true;
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const actor = request.actor;
    if (!actor) {
      throw new AppError('UNAUTHORIZED', 'Authentication required.');
    }

    const allowed = required.every((permission) => actorHasPermission(actor, permission));
    if (!allowed) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    return true;
  }
}
