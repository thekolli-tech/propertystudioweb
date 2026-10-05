import { type NestMiddleware } from '@nestjs/common';
import { type NextFunction, type Request, type Response } from 'express';
import { v7 as uuidv7 } from 'uuid';

export type RequestWithId = Request & { requestId: string };

export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.header('x-request-id');
    const requestId = incoming && incoming.trim().length > 0 ? incoming.trim() : `req_${uuidv7()}`;

    (req as RequestWithId).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
