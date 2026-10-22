import { challengeDtoSchema } from '@miniledger/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createTestApp,
  expectError,
  nextPhone,
  prisma,
  resetDatabase,
  signIn,
  TEST_DATABASE_URL,
  uuid,
  type SignedIn,
  type TestApp,
} from '../helpers';

const PRODUCTION_ENV = {
  AUTH_MODE: 'production',
  NODE_ENV: 'production',
  DATABASE_URL: `${TEST_DATABASE_URL}?sslmode=require`,
  RESEND_API_KEY: 're_test_key',
  RESEND_FROM_EMAIL: 'MiniLedger <no-reply@mail.example.com>',
  PUBLIC_API_ORIGIN: 'https://api.example.com',
};

beforeEach(async () => {
  await resetDatabase();
});

describe('production auth mode', () => {
  let t: TestApp;
  beforeEach(() => {
    t = createTestApp(PRODUCTION_ENV);
  });

  const requestCode = (identifier: string) =>
    request(t.app).post('/v1/auth/otp/request').send({ identifier });

  it('advertises email sign-in', async () => {
    const res = await request(t.app).get('/v1/auth/config');
    expect(res.body).toMatchObject({ authMode: 'production', identifierType: 'EMAIL' });
  });

  it('never offers phone OTP', async () => {
    const res = await requestCode('9876543210');
    expectError(res, 422, 'VALIDATION_FAILED');
    expect(res.body.error.fieldErrors.identifier).toBeDefined();
    expect(t.delivery.sent).toHaveLength(0);
  });

  it('signs in with an emailed code', async () => {
    const requested = await requestCode('  Someone@Example.com ');
    expect(requested.status).toBe(200);
    const challenge = challengeDtoSchema.parse(requested.body);
    expect(challenge.maskedDestination).not.toContain('someone@');
    expect(t.delivery.sent[0]).toMatchObject({
      identifierType: 'EMAIL',
      identifier: 'someone@example.com',
    });

    const verified = await request(t.app)
      .post('/v1/auth/otp/verify')
      .send({ challengeId: challenge.challengeId, code: t.delivery.lastCode() });
    expect(verified.status).toBe(200);
    expect(verified.body.user).toMatchObject({ identifierType: 'EMAIL' });
  });

  it('returns 503 and leaves no usable challenge when delivery fails', async () => {
    t.delivery.fail = true;
    const res = await requestCode('someone@example.com');
    expectError(res, 503, 'OTP_DELIVERY_FAILED');
    const rows = await prisma.otpChallenge.findMany();
    expect(rows.map((r) => r.state)).toEqual(['FAILED']);

    // A failed delivery does not start the resend cooldown.
    t.delivery.fail = false;
    expect((await requestCode('someone@example.com')).status).toBe(200);
  });

  it('stops sending at the global daily cap', async () => {
    const capped = createTestApp({ ...PRODUCTION_ENV, OTP_DAILY_SEND_LIMIT: '2' });
    const send = (email: string) =>
      request(capped.app).post('/v1/auth/otp/request').send({ identifier: email });
    expect((await send('a@example.com')).status).toBe(200);
    expect((await send('b@example.com')).status).toBe(200);
    expectError(await send('c@example.com'), 503, 'OTP_DAILY_LIMIT_REACHED');
    expect(capped.delivery.sent).toHaveLength(2);
  });
});

describe('account deletion', () => {
  let t: TestApp;
  let user: SignedIn;
  let phone: string;

  beforeEach(async () => {
    t = createTestApp();
    phone = nextPhone();
    user = await signIn(t, phone);
  });

  const reauth = (auth = user) =>
    request(t.app).post('/v1/auth/reauth/request').set(auth.auth).send({});
  const deleteMe = (body: Record<string, unknown>, auth = user) =>
    request(t.app).delete('/v1/me').set(auth.auth).send(body);

  async function seedLedger() {
    const loan = await request(t.app)
      .post('/v1/loans')
      .set(user.auth)
      .send({ id: uuid(), personName: 'Rahul', amount: '1000', dueDate: '2026-10-30' });
    await request(t.app)
      .post(`/v1/loans/${loan.body.id}/repayments`)
      .set(user.auth)
      .send({ id: uuid(), amount: '100' });
  }

  it('requires a signed-in session to request a code', async () => {
    expectError(
      await request(t.app).post('/v1/auth/reauth/request').send({}),
      401,
      'UNAUTHENTICATED',
    );
  });

  it('sends the code to the account’s own identifier', async () => {
    const res = await reauth();
    expect(res.status).toBe(200);
    expect(challengeDtoSchema.parse(res.body).maskedDestination).toBe(
      `+91 ••••••${phone.slice(-4)}`,
    );
    expect(t.delivery.sent.at(-1)?.identifier).toBe(`+91${phone}`);
  });

  it('rejects wrong codes, login challenges and codes from another session', async () => {
    const challenge = (await reauth()).body.challengeId as string;
    const code = t.delivery.lastCode();
    const wrong = code === '000000' ? '111111' : '000000';

    const bad = await deleteMe({ challengeId: challenge, code: wrong });
    expectError(bad, 400, 'OTP_INVALID');
    expect(bad.body.error.details.attemptsRemaining).toBe(4);

    // A LOGIN challenge can never delete an account.
    t.clock.advance(61_000);
    const login = await request(t.app).post('/v1/auth/otp/request').send({ identifier: phone });
    expectError(
      await deleteMe({ challengeId: login.body.challengeId, code: t.delivery.lastCode() }),
      400,
      'OTP_INVALID',
    );

    // A second session of the same user cannot use the first session's code.
    t.clock.advance(61_000);
    const other = await signIn(t, phone);
    expectError(await deleteMe({ challengeId: challenge, code }, other), 400, 'OTP_INVALID');

    expect(await prisma.user.count()).toBe(1);
  });

  it('deletes everything for the user and ends every session', async () => {
    await seedLedger();
    const bystander = await signIn(t);
    const challenge = (await reauth()).body.challengeId as string;

    const res = await deleteMe({ challengeId: challenge, code: t.delivery.lastCode() });
    expect(res.status).toBe(204);

    const where = { userId: user.userId };
    expect(await prisma.user.count({ where: { id: user.userId } })).toBe(0);
    expect(await prisma.person.count({ where })).toBe(0);
    expect(await prisma.loan.count({ where })).toBe(0);
    expect(await prisma.repayment.count({ where })).toBe(0);
    expect(await prisma.session.count({ where })).toBe(0);
    expect(await prisma.otpChallenge.count({ where: { identifier: `+91${phone}` } })).toBe(0);
    expect(
      await prisma.otpChallenge.count({ where: { identifier: 'deleted', state: 'INVALIDATED' } }),
    ).toBeGreaterThan(0);

    expectError(await request(t.app).get('/v1/me').set(user.auth), 401, 'UNAUTHENTICATED');
    expectError(
      await request(t.app).post('/v1/auth/refresh').send({ refreshToken: user.refreshToken }),
      401,
      'REFRESH_TOKEN_INVALID',
    );
    // Other users are untouched.
    expect((await request(t.app).get('/v1/me').set(bystander.auth)).status).toBe(200);

    // The same number can sign up again as a brand-new account.
    t.clock.advance(61_000);
    const requested = await request(t.app).post('/v1/auth/otp/request').send({ identifier: phone });
    const verified = await request(t.app)
      .post('/v1/auth/otp/verify')
      .send({ challengeId: requested.body.challengeId, code: t.delivery.lastCode() });
    expect(verified.body.isNewUser).toBe(true);
  });

  it('validates the body', async () => {
    expectError(await deleteMe({}), 422, 'VALIDATION_FAILED');
    expectError(await deleteMe({ challengeId: uuid(), code: '12' }), 422, 'VALIDATION_FAILED');
  });
});
