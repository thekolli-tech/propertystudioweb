import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type Request } from 'express';

import { type AuthActor } from '../tenancy/access-scope';

export type AuthenticatedRequest = Request & {
  requestId?: string;
  actor?: AuthActor;
  rawSessionToken?: string;
};

export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthActor => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.actor) {
      throw new Error('CurrentActor used without authentication');
    }
    return request.actor;
  },
);
