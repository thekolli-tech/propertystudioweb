import { describe, expect, it } from 'vitest';

import { validateEnv } from './env.schema';

const validEnv = {
  NODE_ENV: 'development',
  APP_MARKET: 'IN',
  APP_CURRENCY: 'INR',
  APP_TIMEZONE: 'Asia/Kolkata',
  APP_LOCALE: 'en-IN',
  API_HOST: '0.0.0.0',
  API_PORT: '3001',
  API_PUBLIC_URL: 'http://localhost:3001',
  WEB_ORIGIN: 'http://localhost:3000',
  LOG_LEVEL: 'info',
  DATABASE_URL: 'postgresql://property_studio:property_studio@localhost:5432/property_studio',
  REDIS_URL: 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'ap-south-1',
  S3_ACCESS_KEY_ID: 'minioadmin',
  S3_SECRET_ACCESS_KEY: 'minioadmin',
  S3_BUCKET: 'property-studio',
  S3_FORCE_PATH_STYLE: 'true',
  RATE_LIMIT_WINDOW_MS: '60000',
  RATE_LIMIT_MAX_REQUESTS: '120',
  AUTH_RATE_LIMIT_WINDOW_MS: '60000',
  AUTH_RATE_LIMIT_MAX_REQUESTS: '20',
  PARTNER_RATE_LIMIT_WINDOW_MS: '60000',
  PARTNER_RATE_LIMIT_MAX_REQUESTS: '60',
  WEBHOOK_REPLAY_TOLERANCE_SECONDS: '300',
  WEBHOOK_DELIVERY_TIMEOUT_MS: '10000',
  SESSION_TTL_SECONDS: '1209600',
  ARGON2_MEMORY_COST: '65536',
  ARGON2_TIME_COST: '3',
  ARGON2_PARALLELISM: '1',
} as NodeJS.ProcessEnv;

describe('validateEnv', () => {
  it('accepts a valid environment', () => {
    const env = validateEnv(validEnv);
    expect(env.APP_CURRENCY).toBe('INR');
    expect(env.API_PORT).toBe(3001);
    expect(env.SESSION_TTL_SECONDS).toBe(1_209_600);
  });

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL: _ignored, ...rest } = validEnv;
    expect(() => validateEnv(rest)).toThrow(/Invalid environment configuration/);
  });
});
