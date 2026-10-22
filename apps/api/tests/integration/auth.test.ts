import { challengeDtoSchema, userDtoSchema, verifyResponseSchema } from '@miniledger/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createTestApp,
  expectError,
  nextPhone,
  prisma,
  resetDatabase,
  signIn,
  type TestApp,
} from '../helpers';

let t: TestApp;

beforeEach(async () => {
  await resetDatabase();
  t = createTestApp();
});

const requestCode = (identifier: string, ip?: string) => {
  const req = request(t.app).post('/v1/auth/otp/request');
  if (ip) req.set('X-Forwarded-For', ip);
  return req.send({ identifier });
};
const verify = (challengeId: string, code: string, timezone?: string) =>
  request(t.app).post('/v1/auth/otp/verify').send({ challengeId, code, timezone });

describe('GET /v1/auth/config', () => {
  it('describes assignment mode', async () => {
    const res = await request(t.app).get('/v1/auth/config');
    expect(res.body).toEqual({
      authMode: 'assignment',
      identifierType: 'PHONE',
      otpLength: 6,
      otpTtlSeconds: 300,
      resendCooldownSeconds: 60,
    });
  });
});

describe('POST /v1/auth/otp/request', () => {
  it('normalizes the phone, "prints" the code and returns a masked challenge', async () => {
    const res = await requestCode('+91 98765-43210');
    expect(res.status).toBe(200);
    const body = challengeDtoSchema.parse(res.body);
    expect(body.maskedDestination).toBe('+91 ••••••3210');
    expect(new Date(body.expiresAt).getTime() - t.clock.now().getTime()).toBe(300_000);
    expect(t.delivery.sent).toHaveLength(1);
    expect(t.delivery.sent[0]).toMatchObject({ identifier: '+919876543210' });
    expect(t.delivery.lastCode()).toMatch(/^\d{6}$/);

    const stored = await prisma.otpChallenge.findUniqueOrThrow({ where: { id: body.challengeId } });
    expect(stored.state).toBe('ACTIVE');
    expect(stored.codeDigest).not.toContain(t.delivery.lastCode());
  });

  it('rejects an email in assignment mode', async () => {
    const res = await requestCode('someone@example.com');
    expectError(res, 422, 'VALIDATION_FAILED');
    expect(res.body.error.fieldErrors.identifier).toBe('Enter a 10-digit mobile number');
  });

  it('enforces the 60-second resend cooldown with Retry-After', async () => {
    const phone = nextPhone();
    expect((await requestCode(phone)).status).toBe(200);
    t.clock.advance(20_000);
    const res = await requestCode(phone);
    expectError(res, 429, 'OTP_RESEND_COOLDOWN');
    expect(res.headers['retry-after']).toBe('40');
    t.clock.advance(41_000);
    expect((await requestCode(phone)).status).toBe(200);
  });

  it('allows 5 codes per hour per number', async () => {
    const phone = nextPhone();
    for (let i = 0; i < 5; i++) {
      expect((await requestCode(phone)).status).toBe(200);
      t.clock.advance(61_000);
    }
    expectError(await requestCode(phone), 429, 'RATE_LIMITED');
    t.clock.advance(60 * 60_000);
    expect((await requestCode(phone)).status).toBe(200);
  });

  it('marks the challenge FAILED and returns 503 when delivery fails', async () => {
    t.delivery.fail = true;
    expectError(await requestCode(nextPhone()), 503, 'OTP_DELIVERY_FAILED');
    expect(await prisma.otpChallenge.count({ where: { state: 'FAILED' } })).toBe(1);
  });
});

describe('POST /v1/auth/otp/verify', () => {
  it('creates the user on first sign-in and finds it afterwards', async () => {
    const phone = nextPhone();
    const first = await requestCode(phone);
    const res = await verify(first.body.challengeId, t.delivery.lastCode());
    expect(res.status).toBe(200);
    const body = verifyResponseSchema.parse(res.body);
    expect(body.isNewUser).toBe(true);
    expect(body.user).toMatchObject({ identifierType: 'PHONE', timezone: 'Asia/Kolkata' });

    t.clock.advance(61_000);
    const second = await requestCode(phone);
    const again = await verify(second.body.challengeId, t.delivery.lastCode());
    expect(again.body.isNewUser).toBe(false);
    expect(again.body.user.id).toBe(body.user.id);
  });

  it('counts wrong codes and locks after 5 attempts', async () => {
    const challenge = await requestCode(nextPhone());
    const code = t.delivery.lastCode();
    const wrong = code === '000000' ? '111111' : '000000';

    const first = await verify(challenge.body.challengeId, wrong);
    expectError(first, 400, 'OTP_INVALID');
    expect(first.body.error.details.attemptsRemaining).toBe(4);
    for (let i = 0; i < 3; i++) await verify(challenge.body.challengeId, wrong);
    expectError(await verify(challenge.body.challengeId, wrong), 400, 'OTP_ATTEMPTS_EXCEEDED');
    expectError(await verify(challenge.body.challengeId, code), 400, 'OTP_ATTEMPTS_EXCEEDED');
  });

  it('rejects expired, reused and superseded codes', async () => {
    const phone = nextPhone();
    const expired = await requestCode(phone);
    const expiredCode = t.delivery.lastCode();
    t.clock.advance(300_001);
    expectError(await verify(expired.body.challengeId, expiredCode), 400, 'OTP_EXPIRED');

    const fresh = await requestCode(phone);
    const freshCode = t.delivery.lastCode();
    expect((await verify(fresh.body.challengeId, freshCode)).status).toBe(200);
    expectError(await verify(fresh.body.challengeId, freshCode), 400, 'OTP_INVALID');

    t.clock.advance(61_000);
    const older = await requestCode(phone);
    const olderCode = t.delivery.lastCode();
    t.clock.advance(61_000);
    await requestCode(phone);
    expectError(await verify(older.body.challengeId, olderCode), 400, 'OTP_INVALID');
  });

  it('stores a valid device timezone and ignores an invalid one', async () => {
    const ny = await signIn(t, nextPhone(), 'America/New_York');
    const me = await request(t.app).get('/v1/me').set(ny.auth);
    expect(me.body.timezone).toBe('America/New_York');

    const bad = await signIn(t, nextPhone(), 'Mars/Olympus');
    expect((await request(t.app).get('/v1/me').set(bad.auth)).body.timezone).toBe('Asia/Kolkata');
  });
});

describe('/v1/me and logout', () => {
  it('reads and updates the account', async () => {
    const user = await signIn(t);
    const me = await request(t.app).get('/v1/me').set(user.auth);
    expect(userDtoSchema.parse(me.body).identifierType).toBe('PHONE');

    const patched = await request(t.app)
      .patch('/v1/me')
      .set(user.auth)
      .send({ displayName: '  Suraj  ', timezone: 'Asia/Dubai' });
    expect(patched.body).toMatchObject({ displayName: 'Suraj', timezone: 'Asia/Dubai' });

    const invalid = await request(t.app)
      .patch('/v1/me')
      .set(user.auth)
      .send({ timezone: 'Nope/Zone' });
    expectError(invalid, 422, 'VALIDATION_FAILED');
    expect(invalid.body.error.fieldErrors.timezone).toBeDefined();
  });

  it('logout revokes the session immediately', async () => {
    const user = await signIn(t);
    expect((await request(t.app).post('/v1/auth/logout').set(user.auth)).status).toBe(204);
    expectError(await request(t.app).get('/v1/me').set(user.auth), 401, 'UNAUTHENTICATED');
    expectError(
      await request(t.app).post('/v1/auth/refresh').send({ refreshToken: user.refreshToken }),
      401,
      'REFRESH_TOKEN_INVALID',
    );
  });
});
