import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { type Request, type Response } from 'express';

import { AppConfigService } from '../config/app-config.service';
import { AppError } from '../errors/app-error';
import { RedisService } from './redis.module';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly config: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const path = request.path || '';
    const isAuthRoute = path.includes('/auth/');
    const isAiRoute = path.includes('/ai/');
    const hasSessionCookie = Boolean(
      (request as Request & { cookies?: Record<string, string> }).cookies?.ps_session,
    );

    // AI: anonymous (no session cookie) uses strict auth limits; authenticated uses API limits.
    // Auth routes always use strict limits. Other routes use standard API limits.
    const useStrictLimit = isAuthRoute || (isAiRoute && !hasSessionCookie);
    const windowMs = useStrictLimit
      ? this.config.values.AUTH_RATE_LIMIT_WINDOW_MS
      : this.config.values.RATE_LIMIT_WINDOW_MS;
    const maxRequests = useStrictLimit
      ? this.config.values.AUTH_RATE_LIMIT_MAX_REQUESTS
      : this.config.values.RATE_LIMIT_MAX_REQUESTS;

    const clientIp = this.resolveClientIp(request);
    const bucket = Math.floor(Date.now() / windowMs);
    const scope = isAiRoute
      ? hasSessionCookie
        ? 'ai-auth'
        : 'ai-anon'
      : useStrictLimit
        ? 'auth'
        : 'api';
    const key = `rate-limit:${scope}:${clientIp}:${bucket}`;

    const count = await this.redis.client.incr(key);
    if (count === 1) {
      await this.redis.client.pexpire(key, windowMs);
    }

    response.setHeader('X-RateLimit-Limit', String(maxRequests));
    response.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - count)));

    if (count > maxRequests) {
      throw new AppError('RATE_LIMITED', 'Too many requests. Please try again later.');
    }

    return true;
  }

  private resolveClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) {
        return first;
      }
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
