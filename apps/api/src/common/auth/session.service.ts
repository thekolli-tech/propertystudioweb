import { Injectable } from '@nestjs/common';
import { type Response } from 'express';
import {
  type OrganizationRole,
  type Persona,
  type PlatformRole,
} from '@property-studio/permissions';

import { AppConfigService } from '../config/app-config.service';
import { newUuid, randomToken, sha256 } from '../crypto/ids';
import { PrismaService } from '../prisma/prisma.module';
import { RedisService } from '../rate-limit/redis.module';
import { type AuthActor, buildActorPermissions } from '../tenancy/access-scope';
import { type AuthenticatedRequest } from './current-actor.decorator';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly redis: RedisService,
  ) {}

  cookieName(): string {
    return this.config.isProduction ? '__Host-ps_session' : 'ps_session';
  }

  async createSession(input: {
    userId: string;
    activeOrganizationId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<{ sessionId: string; rawToken: string }> {
    const rawToken = randomToken(32);
    const sessionId = newUuid();
    const expiresAt = new Date(Date.now() + this.config.values.SESSION_TTL_SECONDS * 1000);

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: input.userId,
        tokenHash: sha256(rawToken),
        activeOrganizationId: input.activeOrganizationId ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        expiresAt,
      },
    });

    return { sessionId, rawToken };
  }

  setSessionCookie(res: Response, rawToken: string): void {
    const secure =
      this.config.isProduction || this.config.values.NODE_ENV === 'test'
        ? this.config.isProduction
        : false;

    res.cookie(this.cookieName(), rawToken, {
      httpOnly: true,
      secure: this.config.isProduction ? true : secure,
      sameSite: 'lax',
      path: '/',
      maxAge: this.config.values.SESSION_TTL_SECONDS * 1000,
      // __Host- prefix forbids Domain attribute; omit Domain always.
    });
  }

  clearSessionCookie(res: Response): void {
    res.clearCookie(this.cookieName(), {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    await this.redis.client.set(
      `session:revoked:${sessionId}`,
      '1',
      'EX',
      this.config.values.SESSION_TTL_SECONDS,
    );
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: { id: true },
    });
    if (sessions.length === 0) {
      return;
    }
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    for (const session of sessions) {
      await this.redis.client.set(
        `session:revoked:${session.id}`,
        '1',
        'EX',
        this.config.values.SESSION_TTL_SECONDS,
      );
    }
  }

  async setActiveOrganization(sessionId: string, organizationId: string | null): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { activeOrganizationId: organizationId },
    });
  }

  async resolveActorFromRequest(request: AuthenticatedRequest): Promise<AuthActor | null> {
    const rawToken =
      (request.cookies?.[this.cookieName()] as string | undefined) ??
      (typeof request.headers.cookie === 'string'
        ? this.extractCookie(request.headers.cookie, this.cookieName())
        : undefined);

    if (!rawToken) {
      return null;
    }

    request.rawSessionToken = rawToken;
    const tokenHash = sha256(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
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
        activeOrganization: true,
      },
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    const revoked = await this.redis.client.get(`session:revoked:${session.id}`);
    if (revoked) {
      return null;
    }

    if (session.user.status !== 'ACTIVE') {
      return null;
    }

    // Optional mobile/API org header must match an active membership; cannot escalate.
    const headerOrgId = request.header('x-organization-id');
    let activeOrganizationId = session.activeOrganizationId;
    let activeOrganizationPublicId = session.activeOrganization?.publicId ?? null;
    let organizationRole: OrganizationRole | null = null;

    if (headerOrgId) {
      const membership = session.user.memberships.find(
        (item) => item.organizationId === headerOrgId && item.organization.status === 'ACTIVE',
      );
      if (!membership) {
        return null;
      }
      activeOrganizationId = membership.organizationId;
      activeOrganizationPublicId = membership.organization.publicId;
      organizationRole = membership.role as OrganizationRole;
    } else if (activeOrganizationId) {
      const membership = session.user.memberships.find(
        (item) => item.organizationId === activeOrganizationId,
      );
      if (!membership || membership.organization.status !== 'ACTIVE') {
        activeOrganizationId = null;
        activeOrganizationPublicId = null;
        organizationRole = null;
      } else {
        organizationRole = membership.role as OrganizationRole;
      }
    }

    const platformRoles = session.user.platformRoles.map((row) => row.role as PlatformRole);
    const personas = session.user.personas.map((row) => row.persona as Persona);

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
      permissions: buildActorPermissions({ platformRoles, organizationRole, personas }),
    };
  }

  private extractCookie(header: string, name: string): string | undefined {
    const parts = header.split(';');
    for (const part of parts) {
      const [key, ...rest] = part.trim().split('=');
      if (key === name) {
        return decodeURIComponent(rest.join('='));
      }
    }
    return undefined;
  }
}
