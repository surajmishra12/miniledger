/**
 * Integration-test harness: real PostgreSQL (miniledger_test), injected clock, captured OTPs.
 */
import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { expect } from 'vitest';

import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import type { AppContext } from '../src/context';
import { createLogger } from '../src/lib/logger';
import type { OtpDelivery, OtpMessage } from '../src/lib/otp-delivery';
import { createPrisma } from '../src/lib/prisma';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://miniledger:miniledger@localhost:5433/miniledger_test';

/** One client for the whole run; tests reset tables instead of reconnecting. */
export const prisma = createPrisma(TEST_DATABASE_URL);

/** 22 Oct 2026, 12:00 IST. */
export const START = new Date('2026-10-22T06:30:00.000Z');

export class FakeClock {
  current = new Date(START);
  now = () => new Date(this.current);
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
  set(iso: string) {
    this.current = new Date(iso);
  }
}

export class CapturingDelivery implements OtpDelivery {
  sent: OtpMessage[] = [];
  fail = false;
  async send(message: OtpMessage) {
    if (this.fail) throw new Error('simulated delivery failure');
    this.sent.push(message);
  }
  lastCode(): string {
    const last = this.sent[this.sent.length - 1];
    if (!last) throw new Error('No OTP was sent');
    return last.code;
  }
}

export function createTestApp(envOverrides: Record<string, string> = {}) {
  const env = loadEnv({
    NODE_ENV: 'test',
    AUTH_MODE: 'assignment',
    DATABASE_URL: TEST_DATABASE_URL,
    JWT_SECRET: 'test-jwt-secret-0123456789abcdef0123456789',
    OTP_HMAC_SECRET: 'test-otp-secret-0123456789abcdef0123456789',
    REFRESH_TOKEN_HMAC_SECRET: 'test-refresh-secret-0123456789abcdef012345',
    ...envOverrides,
  });
  const clock = new FakeClock();
  const delivery = new CapturingDelivery();
  const ctx: AppContext = {
    env,
    prisma,
    clock,
    delivery,
    logger: createLogger('silent'),
    version: '1.0.0-test',
  };
  return { app: createApp(ctx), ctx, clock, delivery };
}

export type TestApp = ReturnType<typeof createTestApp>;

/** Removes all rows. users cascades to people, loans, repayments, sessions. */
export async function resetDatabase() {
  await prisma.$executeRaw`TRUNCATE TABLE users, otp_challenges CASCADE`;
}

let phoneCounter = 0;
export function nextPhone(): string {
  phoneCounter += 1;
  return `98765${String(10000 + phoneCounter).slice(-5)}`;
}

export type SignedIn = {
  token: string;
  refreshToken: string;
  userId: string;
  auth: { Authorization: string };
};

/** Full OTP sign-in for a phone number; returns bearer credentials. */
export async function signIn(
  t: TestApp,
  phone = nextPhone(),
  timezone?: string,
): Promise<SignedIn> {
  const requested = await request(t.app).post('/v1/auth/otp/request').send({ identifier: phone });
  expect(requested.status).toBe(200);
  const verified = await request(t.app)
    .post('/v1/auth/otp/verify')
    .send({ challengeId: requested.body.challengeId, code: t.delivery.lastCode(), timezone });
  expect(verified.status).toBe(200);
  const token = verified.body.tokens.accessToken as string;
  return {
    token,
    refreshToken: verified.body.tokens.refreshToken as string,
    userId: verified.body.user.id as string,
    auth: { Authorization: `Bearer ${token}` },
  };
}

export const uuid = () => randomUUID();

/** Expects the standard error envelope with a given code. */
export function expectError(res: request.Response, status: number, code: string) {
  expect(res.status, JSON.stringify(res.body)).toBe(status);
  expect(res.body.error.code).toBe(code);
  expect(res.body.error).toMatchObject({
    fieldErrors: expect.any(Object),
    details: expect.any(Object),
    requestId: expect.any(String),
  });
}
