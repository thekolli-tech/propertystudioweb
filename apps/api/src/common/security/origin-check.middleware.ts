import { Injectable, type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';

import { AppConfigService } from '../config/app-config.service';
import { AppError } from '../errors/app-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class OriginCheckMiddleware implements NestMiddleware {
  constructor(private readonly config: AppConfigService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
      next();
      return;
    }

    // Provider webhooks authenticate via signature, not browser Origin.
    const path = req.path || '';
    if (path.includes('/payments/webhooks/')) {
      next();
      return;
    }

    const origin = req.header('origin');
    const allowed = this.config.values.WEB_ORIGIN;
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies ?? {};
    const hasSessionCookie = Boolean(cookies.ps_session || cookies['__Host-ps_session']);

    // Browser state-changing requests must match WEB_ORIGIN.
    if (origin && origin !== allowed) {
      next(new AppError('FORBIDDEN', 'Origin not allowed.'));
      return;
    }

    // Cookie-authenticated mutating requests from browsers always send Origin.
    // Reject cookie + mismatched Referer when Origin is absent (defense in depth).
    if (hasSessionCookie && !origin) {
      const referer = req.header('referer');
      if (referer) {
        try {
          const refererOrigin = new URL(referer).origin;
          if (refererOrigin !== allowed) {
            next(new AppError('FORBIDDEN', 'Origin not allowed.'));
            return;
          }
        } catch {
          next(new AppError('FORBIDDEN', 'Origin not allowed.'));
          return;
        }
      }
    }

    next();
  }
}
