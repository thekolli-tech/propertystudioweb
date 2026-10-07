import { z } from 'zod';

const booleanFromString = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  return value === 'true' || value === '1';
});

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_MARKET: z.literal('IN').default('IN'),
    APP_CURRENCY: z.literal('INR').default('INR'),
    APP_TIMEZONE: z.literal('Asia/Kolkata').default('Asia/Kolkata'),
    APP_LOCALE: z.literal('en-IN').default('en-IN'),
    API_HOST: z.string().default('0.0.0.0'),
    API_PORT: z.coerce.number().int().positive().default(3001),
    API_PUBLIC_URL: z.url(),
    WEB_ORIGIN: z.url(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().min(1),
    S3_ACCESS_KEY_ID: z.string().min(1),
    S3_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET: z.string().min(1),
    S3_FORCE_PATH_STYLE: booleanFromString.default(true),
    /** When true, honor X-Forwarded-For for rate-limit IP bucketing (trusted reverse proxy only). */
    TRUST_PROXY: booleanFromString.default(false),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
    AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    AUTH_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(20),
    PARTNER_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    PARTNER_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(60),
    WEBHOOK_REPLAY_TOLERANCE_SECONDS: z.coerce.number().int().positive().default(300),
    WEBHOOK_DELIVERY_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    INTEGRATION_SECRETS_KEY: z.string().min(32).optional(),
    SESSION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(60 * 60 * 24 * 14),
    ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(65536),
    ARGON2_TIME_COST: z.coerce.number().int().positive().default(3),
    ARGON2_PARALLELISM: z.coerce.number().int().positive().default(1),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    PAYMENTS_PROVIDER: z.enum(['NONE', 'RAZORPAY', 'SANDBOX', 'MANUAL']).default('SANDBOX'),
    /** Explicit opt-in for SANDBOX payments when NODE_ENV=production (staging only). */
    ALLOW_SANDBOX_PAYMENTS: booleanFromString.default(false),
    DEFAULT_LEAD_PURCHASE_PRICE_MINOR: z.coerce.number().int().nonnegative().default(50_000),
    /** Max JSON body size in bytes for the API (webhooks included). */
    BODY_SIZE_LIMIT_BYTES: z.coerce.number().int().positive().default(1_048_576),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') {
      return;
    }

    if (!env.API_PUBLIC_URL.startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['API_PUBLIC_URL'],
        message: 'Must use https:// in production.',
      });
    }
    if (!env.WEB_ORIGIN.startsWith('https://')) {
      ctx.addIssue({
        code: 'custom',
        path: ['WEB_ORIGIN'],
        message: 'Must use https:// in production.',
      });
    }
    if (env.PAYMENTS_PROVIDER === 'SANDBOX' && !env.ALLOW_SANDBOX_PAYMENTS) {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYMENTS_PROVIDER'],
        message:
          'SANDBOX is not allowed in production unless ALLOW_SANDBOX_PAYMENTS=true (staging only).',
      });
    }
    if (env.PAYMENTS_PROVIDER === 'RAZORPAY') {
      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET || !env.RAZORPAY_WEBHOOK_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['RAZORPAY_WEBHOOK_SECRET'],
          message:
            'RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET are required when PAYMENTS_PROVIDER=RAZORPAY.',
        });
      }
    }
    if (env.LOG_LEVEL === 'debug' || env.LOG_LEVEL === 'trace') {
      ctx.addIssue({
        code: 'custom',
        path: ['LOG_LEVEL'],
        message: 'debug/trace logging is not allowed in production.',
      });
    }
  });

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(raw: NodeJS.ProcessEnv = process.env): AppEnv {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}
