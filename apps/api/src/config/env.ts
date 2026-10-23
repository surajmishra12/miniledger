/**
 * Runtime environment validation (architecture.md §7.1, §11.1).
 * The process must refuse to start on any misconfiguration ("fail closed").
 */
import { normalizeEmail } from '@miniledger/shared';
import { z } from 'zod';

const MIN_SECRET_BYTES = 32;
const SECURE_SSL_MODES = new Set(['require', 'verify-ca', 'verify-full']);

/** Codes anyone would try first; refused for the store-review account. */
function isGuessableCode(code: string): boolean {
  const sameDigit = /^(\d)\1{5}$/.test(code);
  const ascending = '01234567890'.includes(code);
  const descending = '09876543210'.includes(code);
  return sameDigit || ascending || descending;
}

const secret = z
  .string({ error: 'is required' })
  .refine(
    (value) => Buffer.byteLength(value, 'utf8') >= MIN_SECRET_BYTES,
    `must be at least ${MIN_SECRET_BYTES} bytes`,
  );

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === '' ? undefined : v));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AUTH_MODE: z.enum(['assignment', 'production'], {
    error: 'must be "assignment" or "production"',
  }),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.url({ error: 'must be a valid connection URL' }),
  JWT_SECRET: secret,
  OTP_HMAC_SECRET: secret,
  REFRESH_TOKEN_HMAC_SECRET: secret,
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: optionalString,
  PUBLIC_API_ORIGIN: optionalString,
  OTP_DAILY_SEND_LIMIT: z.coerce.number().int().min(1).default(90),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  RENDER: optionalString,
  /** Store-review sign-in (production only): this one email gets REVIEW_ACCOUNT_CODE, not an email. */
  REVIEW_ACCOUNT_EMAIL: optionalString,
  REVIEW_ACCOUNT_CODE: optionalString,
});

export type Env = z.output<typeof envSchema>;

export class ConfigError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Invalid configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

/** Parses and cross-checks the environment. Throws ConfigError listing every problem. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    // Report variable names and rules only — never echo values (they may be secrets).
    throw new ConfigError(
      parsed.error.issues.map((issue) => `${issue.path.join('.') || 'env'} ${issue.message}`),
    );
  }

  const env = parsed.data;
  const problems: string[] = [];

  const secrets = [env.JWT_SECRET, env.OTP_HMAC_SECRET, env.REFRESH_TOKEN_HMAC_SECRET];
  if (new Set(secrets).size !== secrets.length) {
    problems.push('JWT_SECRET, OTP_HMAC_SECRET and REFRESH_TOKEN_HMAC_SECRET must all differ');
  }

  if (env.AUTH_MODE === 'assignment') {
    if (env.NODE_ENV === 'production') {
      problems.push('AUTH_MODE=assignment is not allowed when NODE_ENV=production');
    }
    if (env.RENDER !== undefined) {
      problems.push('AUTH_MODE=assignment is not allowed on a hosted (Render) deployment');
    }
  }

  if (env.AUTH_MODE === 'production') {
    for (const name of ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'PUBLIC_API_ORIGIN'] as const) {
      if (env[name] === undefined) problems.push(`${name} is required when AUTH_MODE=production`);
    }
    const sslMode = new URL(env.DATABASE_URL).searchParams.get('sslmode');
    if (sslMode === null || !SECURE_SSL_MODES.has(sslMode)) {
      problems.push('DATABASE_URL must use sslmode=require when AUTH_MODE=production');
    }
  }

  const reviewEmail = env.REVIEW_ACCOUNT_EMAIL;
  const reviewCode = env.REVIEW_ACCOUNT_CODE;
  if ((reviewEmail === undefined) !== (reviewCode === undefined)) {
    problems.push('REVIEW_ACCOUNT_EMAIL and REVIEW_ACCOUNT_CODE must be set together');
  } else if (reviewEmail !== undefined && reviewCode !== undefined) {
    if (env.AUTH_MODE !== 'production') {
      problems.push('REVIEW_ACCOUNT_EMAIL is only used when AUTH_MODE=production');
    }
    if (normalizeEmail(reviewEmail) === null) {
      problems.push('REVIEW_ACCOUNT_EMAIL must be a valid email address');
    }
    if (!/^\d{6}$/.test(reviewCode)) {
      problems.push('REVIEW_ACCOUNT_CODE must be exactly 6 digits');
    } else if (isGuessableCode(reviewCode)) {
      problems.push('REVIEW_ACCOUNT_CODE is too easy to guess (no repeated or sequential digits)');
    }
  }

  if (problems.length > 0) throw new ConfigError(problems);
  return env;
}
