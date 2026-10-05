import { Injectable } from '@nestjs/common';
import {
  type AuthSuccessResponse,
  type ChangePasswordRequest,
  type LoginRequest,
  type RegisterRequest,
  type UserSummary,
} from '@property-studio/contracts';
import { type Persona, type PlatformRole } from '@property-studio/permissions';
import { type Response } from 'express';

import { AuditService } from '../../common/audit/audit.service';
import { type AuthenticatedRequest } from '../../common/auth/current-actor.decorator';
import { SessionService } from '../../common/auth/session.service';
import { newUuid } from '../../common/crypto/ids';
import { PasswordService } from '../../common/crypto/password.service';
import { AppError } from '../../common/errors/app-error';
import { PublicIdService } from '../../common/ids/public-id.service';
import { PrismaService } from '../../common/prisma/prisma.module';
import { RedisService } from '../../common/rate-limit/redis.module';
import { type AuthActor, buildActorPermissions } from '../../common/tenancy/access-scope';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly publicIds: PublicIdService,
    private readonly sessions: SessionService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
  ) {}

  async register(
    input: RegisterRequest,
    request: AuthenticatedRequest,
    res: Response,
  ): Promise<AuthSuccessResponse> {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('CONFLICT', 'Unable to create account with the provided credentials.');
    }

    const userId = newUuid();
    const publicId = await this.publicIds.nextUserPublicId();
    const passwordHash = await this.passwords.hash(input.password);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          publicId,
          email,
          status: 'ACTIVE',
          createdBy: userId,
          updatedBy: userId,
        },
      });
      await tx.userCredential.create({
        data: {
          id: newUuid(),
          userId,
          passwordHash,
        },
      });
      if (input.personas.length > 0) {
        await tx.userPersona.createMany({
          data: input.personas.map((persona) => ({
            id: newUuid(),
            userId,
            persona,
            createdBy: userId,
          })),
        });
      }
    });

    const session = await this.sessions.createSession({
      userId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']?.toString() ?? null,
    });
    this.sessions.setSessionCookie(res, session.rawToken);

    await this.audit.write({
      actorUserId: userId,
      sessionId: session.sessionId,
      action: 'auth.register',
      resourceType: 'user',
      resourceId: publicId,
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']?.toString(),
    });

    const actor = await this.buildActorForUser(userId, session.sessionId);
    return { user: this.toUserSummary(actor) };
  }

  async login(
    input: LoginRequest,
    request: AuthenticatedRequest,
    res: Response,
  ): Promise<AuthSuccessResponse> {
    const email = input.email.toLowerCase();
    await this.assertNotRateLimited(email, request.ip);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { credential: true },
    });

    const reject = async () => {
      await this.recordFailedLogin(email, request);
      throw new AppError('UNAUTHORIZED', 'Invalid email or password.');
    };

    if (!user?.credential || user.status !== 'ACTIVE') {
      await reject();
      throw new AppError('UNAUTHORIZED', 'Invalid email or password.');
    }

    const ok = await this.passwords.verify(user.credential.passwordHash, input.password);
    if (!ok) {
      await reject();
      throw new AppError('UNAUTHORIZED', 'Invalid email or password.');
    }

    const existingActor = await this.sessions.resolveActorFromRequest(request);
    if (existingActor) {
      await this.sessions.revokeSession(existingActor.sessionId);
    }

    const session = await this.sessions.createSession({
      userId: user.id,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']?.toString() ?? null,
    });
    this.sessions.setSessionCookie(res, session.rawToken);
    await this.clearFailedLogin(email, request.ip);

    await this.audit.write({
      actorUserId: user.id,
      sessionId: session.sessionId,
      action: 'auth.login',
      resourceType: 'user',
      resourceId: user.publicId,
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']?.toString(),
    });

    const actor = await this.buildActorForUser(user.id, session.sessionId);
    return { user: this.toUserSummary(actor) };
  }

  async logout(request: AuthenticatedRequest, res: Response): Promise<{ ok: true }> {
    const actor = await this.sessions.resolveActorFromRequest(request);
    if (actor) {
      await this.sessions.revokeSession(actor.sessionId);
      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        organizationId: actor.activeOrganizationId,
        action: 'auth.logout',
        resourceType: 'session',
        resourceId: actor.sessionId,
        requestId: request.requestId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']?.toString(),
      });
    }
    this.sessions.clearSessionCookie(res);
    return { ok: true };
  }

  async me(actor: AuthActor): Promise<AuthSuccessResponse> {
    return { user: this.toUserSummary(actor) };
  }

  async changePassword(
    actor: AuthActor,
    input: ChangePasswordRequest,
    request: AuthenticatedRequest,
  ): Promise<{ ok: true }> {
    const credential = await this.prisma.userCredential.findUnique({
      where: { userId: actor.userId },
    });
    if (!credential) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    const valid = await this.passwords.verify(credential.passwordHash, input.currentPassword);
    if (!valid) {
      await this.audit.write({
        actorUserId: actor.userId,
        sessionId: actor.sessionId,
        action: 'auth.password_change_failed',
        resourceType: 'user',
        resourceId: actor.userPublicId,
        requestId: request.requestId,
        ipAddress: request.ip,
      });
      throw new AppError('UNAUTHORIZED', 'Invalid email or password.');
    }

    const passwordHash = await this.passwords.hash(input.newPassword);
    await this.prisma.userCredential.update({
      where: { userId: actor.userId },
      data: { passwordHash },
    });
    await this.sessions.revokeAllUserSessions(actor.userId);

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'auth.password_changed',
      resourceType: 'user',
      resourceId: actor.userPublicId,
      requestId: request.requestId,
      ipAddress: request.ip,
    });

    return { ok: true };
  }

  async setPersonas(
    actor: AuthActor,
    personas: Persona[],
    request: AuthenticatedRequest,
  ): Promise<AuthSuccessResponse> {
    const before = actor.personas;
    await this.prisma.$transaction(async (tx) => {
      await tx.userPersona.deleteMany({ where: { userId: actor.userId } });
      if (personas.length > 0) {
        await tx.userPersona.createMany({
          data: personas.map((persona) => ({
            id: newUuid(),
            userId: actor.userId,
            persona,
            createdBy: actor.userId,
          })),
        });
      }
    });

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'user.personas_updated',
      resourceType: 'user',
      resourceId: actor.userPublicId,
      requestId: request.requestId,
      before: { personas: before },
      after: { personas },
    });

    const refreshed = await this.buildActorForUser(actor.userId, actor.sessionId);
    return { user: this.toUserSummary(refreshed) };
  }

  async grantPlatformRole(
    actor: AuthActor,
    userPublicId: string,
    role: PlatformRole,
    request: AuthenticatedRequest,
  ): Promise<{ ok: true }> {
    if (
      !actor.permissions.has('platform:users:manage') &&
      !actor.permissions.has('platform:admin')
    ) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }
    if (role === 'SUPER_ADMIN' && !actor.platformRoles.includes('SUPER_ADMIN')) {
      throw new AppError('FORBIDDEN', 'Insufficient permissions.');
    }

    const user = await this.prisma.user.findUnique({ where: { publicId: userPublicId } });
    if (!user) {
      throw new AppError('NOT_FOUND', 'Resource not found.');
    }

    await this.prisma.userPlatformRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      create: {
        id: newUuid(),
        userId: user.id,
        role,
        createdBy: actor.userId,
      },
      update: {},
    });

    await this.sessions.revokeAllUserSessions(user.id);

    await this.audit.write({
      actorUserId: actor.userId,
      sessionId: actor.sessionId,
      action: 'user.platform_role_granted',
      resourceType: 'user',
      resourceId: user.publicId,
      requestId: request.requestId,
      after: { role },
    });

    return { ok: true };
  }

  toUserSummary(actor: AuthActor): UserSummary {
    return {
      publicId: actor.userPublicId,
      email: actor.email,
      emailVerified: false,
      status: 'ACTIVE',
      platformRoles: actor.platformRoles,
      personas: actor.personas,
      activeOrganizationPublicId: actor.activeOrganizationPublicId,
    };
  }

  async buildActorForUser(userId: string, sessionId: string): Promise<AuthActor> {
    const session = await this.prisma.session.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        activeOrganization: true,
        user: {
          include: {
            platformRoles: true,
            personas: true,
            memberships: {
              where: { status: 'ACTIVE' },
              include: { organization: true },
            },
          },
        },
      },
    });

    const platformRoles = session.user.platformRoles.map((row) => row.role as PlatformRole);
    const personas = session.user.personas.map((row) => row.persona as Persona);
    let activeOrganizationId = session.activeOrganizationId;
    let activeOrganizationPublicId = session.activeOrganization?.publicId ?? null;
    let organizationRole: AuthActor['organizationRole'] = null;

    if (activeOrganizationId) {
      const membership = session.user.memberships.find(
        (item) => item.organizationId === activeOrganizationId,
      );
      if (!membership || membership.organization.status !== 'ACTIVE') {
        activeOrganizationId = null;
        activeOrganizationPublicId = null;
      } else {
        organizationRole = membership.role as AuthActor['organizationRole'];
      }
    }

    return {
      userId: session.user.id,
      userPublicId: session.user.publicId,
      email: session.user.email,
      sessionId: session.id,
      platformRoles,
      personas,
      activeOrganizationId,
      activeOrganizationPublicId,
      organizationRole,
      permissions: buildActorPermissions({ platformRoles, organizationRole }),
    };
  }

  private failedKey(email: string, ip?: string): string {
    return `auth:failed:${email}:${ip ?? 'unknown'}`;
  }

  private async assertNotRateLimited(email: string, ip?: string): Promise<void> {
    const count = Number((await this.redis.client.get(this.failedKey(email, ip))) ?? '0');
    if (count >= 10) {
      throw new AppError('RATE_LIMITED', 'Too many requests. Please try again later.');
    }
  }

  private async recordFailedLogin(email: string, request: AuthenticatedRequest): Promise<void> {
    const key = this.failedKey(email, request.ip);
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.expire(key, 15 * 60);
    }
    await this.audit.write({
      action: 'auth.login_failed',
      resourceType: 'user',
      resourceId: email,
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent']?.toString(),
      metadata: { attempt: count },
    });
  }

  private async clearFailedLogin(email: string, ip?: string): Promise<void> {
    await this.redis.client.del(this.failedKey(email, ip));
  }
}
