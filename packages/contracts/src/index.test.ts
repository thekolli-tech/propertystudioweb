import { describe, expect, it } from 'vitest';

import { healthResponseSchema, readyResponseSchema } from './index';

describe('healthResponseSchema', () => {
  it('accepts a valid health payload', () => {
    const parsed = healthResponseSchema.parse({
      status: 'ok',
      service: 'property-studio-api',
      timestamp: new Date().toISOString(),
    });

    expect(parsed.status).toBe('ok');
  });
});

describe('readyResponseSchema', () => {
  it('accepts a ready payload with dependency checks', () => {
    const parsed = readyResponseSchema.parse({
      status: 'ok',
      service: 'property-studio-api',
      timestamp: new Date().toISOString(),
      checks: [
        { name: 'postgres', status: 'ok', latencyMs: 2 },
        { name: 'redis', status: 'ok', latencyMs: 1 },
      ],
    });

    expect(parsed.checks).toHaveLength(2);
  });
});
