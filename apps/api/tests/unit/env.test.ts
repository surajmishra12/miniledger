import { describe, expect, it } from 'vitest';

import { ConfigError, loadEnv } from '../../src/config/env';

const base = {
  NODE_ENV: 'development',
  AUTH_MODE: 'assignment',
  DATABASE_URL: 'postgresql://u:p@localhost:5433/miniledger',
  JWT_SECRET: 'j'.repeat(32),
  OTP_HMAC_SECRET: 'o'.repeat(32),
  REFRESH_TOKEN_HMAC_SECRET: 'r'.repeat(32),
};

const production = {
  ...base,
  NODE_ENV: 'production',
  AUTH_MODE: 'production',
  DATABASE_URL: 'postgresql://u:p@neon.example/db?sslmode=require',
  RESEND_API_KEY: 're_test',
  RESEND_FROM_EMAIL: 'MiniLedger <no-reply@mail.example.com>',
  PUBLIC_API_ORIGIN: 'https://api.example.com',
};

function problemsFor(source: Record<string, string | undefined>): string[] {
  try {
    loadEnv(source);
    return [];
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigError);
    return (error as ConfigError).problems;
  }
}

describe('loadEnv', () => {
  it('accepts a valid assignment configuration with defaults', () => {
    const env = loadEnv(base);
    expect(env).toMatchObject({ AUTH_MODE: 'assignment', PORT: 4000, TRUST_PROXY_HOPS: 0 });
  });

  it('accepts a valid production configuration', () => {
    expect(loadEnv(production).AUTH_MODE).toBe('production');
  });

  it('fails when AUTH_MODE is missing or unknown', () => {
    expect(problemsFor({ ...base, AUTH_MODE: undefined })).not.toHaveLength(0);
    expect(problemsFor({ ...base, AUTH_MODE: 'mock' })).not.toHaveLength(0);
  });

  it('fails on a missing or short secret without echoing it', () => {
    const problems = problemsFor({ ...base, JWT_SECRET: 'short-secret' });
    expect(problems.join(' ')).toContain('JWT_SECRET');
    expect(problems.join(' ')).not.toContain('short-secret');
    expect(problemsFor({ ...base, OTP_HMAC_SECRET: undefined })).not.toHaveLength(0);
  });

  it('fails when secrets are reused', () => {
    expect(problemsFor({ ...base, OTP_HMAC_SECRET: base.JWT_SECRET })).not.toHaveLength(0);
  });

  it('refuses assignment mode in production or on Render', () => {
    expect(problemsFor({ ...base, NODE_ENV: 'production' })).not.toHaveLength(0);
    expect(problemsFor({ ...base, RENDER: 'true' })).not.toHaveLength(0);
  });

  it('requires Resend settings and TLS in production', () => {
    expect(problemsFor({ ...production, RESEND_API_KEY: undefined })).not.toHaveLength(0);
    expect(problemsFor({ ...production, PUBLIC_API_ORIGIN: '' })).not.toHaveLength(0);
    expect(
      problemsFor({ ...production, DATABASE_URL: 'postgresql://u:p@neon.example/db' }),
    ).not.toHaveLength(0);
  });
});
