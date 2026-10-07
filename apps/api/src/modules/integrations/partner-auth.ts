import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type PartnerApiScope } from '@property-studio/contracts';
import { type Request, type Response } from 'express';

import { AppConfigService } from '../../common/config/app-config.service';
import { PasswordService } from '../../common/crypto/password.service';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../common/prisma/prisma.module';
import { RedisService } from '../../common/rate-limit/redis.module';

export const PARTNER_SCOPES_KEY = 'partner_scopes';

export const RequirePartnerScopes = (...scopes: PartnerApiScope[]) =>
  SetMetadata(PARTNER_SCOPES_KEY, scopes);

export type PartnerActor = {
  apiClientId: string;
  apiClientPublicId: string;
  partnerIntegrationId: string;
  partnerIntegrationPublicId: string;
  organizationId: string;
  organizationPublicId: string;
  scopes: PartnerApiScope[];
  environment: 'LIVE' | 'TEST';
};

export type PartnerAuthenticatedRequest = Request & {
  partnerActor?: PartnerActor;
};

@Injectable()
export class PartnerAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly redis: RedisService,
    private readonly config: AppConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<PartnerAuthenticatedRequest>();
    const response = http.getResponse<Response>();

    const header = request.headers.authorization;
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      throw new AppError('UNAUTHORIZED', 'API key required.');
    }

    const secret = header.slice(7).trim();
    if (!secret.startsWith('ps_')) {
      throw new AppError('UNAUTHORIZED', 'Invalid API key.');
    }

    const prefix = secret.slice(0, 16);
    const client = await this.prisma.apiClient.findUnique({
      where: { keyPrefix: prefix },
      include: {
        partnerIntegration: {
          include: { organization: true },
        },
      },
    });

    if (!client) {
      throw new AppError('UNAUTHORIZED', 'Invalid API key.');
    }

    if (client.status === 'REVOKED') {
      throw new AppError('UNAUTHORIZED', 'API key has been revoked.');
    }

    if (client.status === 'EXPIRED' || (client.expiresAt && client.expiresAt.getTime() <= Date.now())) {
      throw new AppError('UNAUTHORIZED', 'API key has expired.');
    }

    const partner = client.partnerIntegration;
    if (partner.status === 'SUSPENDED' || partner.status === 'REVOKED') {
      throw new AppError('FORBIDDEN', 'Partner integration is not active.');
    }

    if (partner.organization.status !== 'ACTIVE') {
      throw new AppError('FORBIDDEN', 'Organization is not active.');
    }

    const valid = await this.passwords.verify(client.keyHash, secret);
    if (!valid) {
      throw new AppError('UNAUTHORIZED', 'Invalid API key.');
    }

    await this.enforcePartnerRateLimit(client.id, response);

    const scopes = client.scopes as PartnerApiScope[];
    const required =
      this.reflector.getAllAndOverride<PartnerApiScope[]>(PARTNER_SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length > 0 && !required.every((scope) => scopes.includes(scope))) {
      throw new AppError('FORBIDDEN', 'Insufficient API key scope.');
    }

    await this.prisma.apiClient.update({
      where: { id: client.id },
      data: { lastUsedAt: new Date() },
    });

    request.partnerActor = {
      apiClientId: client.id,
      apiClientPublicId: client.publicId,
      partnerIntegrationId: partner.id,
      partnerIntegrationPublicId: partner.publicId,
      organizationId: partner.organizationId,
      organizationPublicId: partner.organization.publicId,
      scopes,
      environment: client.environment,
    };

    return true;
  }

  private async enforcePartnerRateLimit(apiClientId: string, response: Response): Promise<void> {
    const windowMs = this.config.values.PARTNER_RATE_LIMIT_WINDOW_MS;
    const maxRequests = this.config.values.PARTNER_RATE_LIMIT_MAX_REQUESTS;
    const bucket = Math.floor(Date.now() / windowMs);
    const key = `rate-limit:partner:${apiClientId}:${bucket}`;
    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.pexpire(key, windowMs);
    }

    response.setHeader('X-RateLimit-Limit', String(maxRequests));
    response.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - count)));
    response.setHeader('X-RateLimit-Scope', 'partner-api-client');

    if (count > maxRequests) {
      throw new AppError('RATE_LIMITED', 'Partner API rate limit exceeded.');
    }
  }
}
