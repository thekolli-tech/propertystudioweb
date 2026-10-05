import { type ArgumentMetadata, type PipeTransform } from '@nestjs/common';
import { type ZodType } from 'zod';

import { AppError } from '../errors/app-error';

/** Constructed per-route with `new ZodValidationPipe(schema)` — not DI-managed. */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {
    if (!schema || typeof schema.safeParse !== 'function') {
      throw new Error('ZodValidationPipe requires a Zod schema with safeParse().');
    }
  }

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new AppError('VALIDATION_ERROR', 'Request validation failed.', {
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    return result.data;
  }
}
