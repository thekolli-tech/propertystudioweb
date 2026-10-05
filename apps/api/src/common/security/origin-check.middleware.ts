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

    const origin = req.header('origin');
    const allowed = this.config.values.WEB_ORIGIN;

    // Non-browser clients may omit Origin (mobile/API). Browser state-changing requests must match.
    if (origin && origin !== allowed) {
      next(new AppError('FORBIDDEN', 'Origin not allowed.'));
      return;
    }

    next();
  }
}
