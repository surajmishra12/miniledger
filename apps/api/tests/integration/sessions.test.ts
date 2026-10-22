import { tokenPairDtoSchema } from '@miniledger/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  createTestApp,
  expectError,
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

const refresh = (refreshToken: string) =>
  request(t.app).post('/v1/auth/refresh').send({ refreshToken });
const me = (token: string) => request(t.app).get('/v1/me').set('Authorization', `Bearer ${token}`);

describe('refresh tokens', () => {
  it('rotate on every refresh', async () => {
    const user = await signIn(t);
    const res = await refresh(user.refreshToken);
    expect(res.status).toBe(200);
    const pair = tokenPairDtoSchema.parse(res.body);
    expect(pair.refreshToken).not.toBe(user.refreshToken);
    expect((await me(pair.accessToken)).status).toBe(200);
  });

  it('accept the previous token within 30 s (lost response) without revoking', async () => {
    const user = await signIn(t);
    const first = await refresh(user.refreshToken);
    t.clock.advance(10_000);
    const grace = await refresh(user.refreshToken);
    expect(grace.status).toBe(200);
    expect((await me(grace.body.accessToken)).status).toBe(200);
    // The successor from the lost response can no longer be used.
    expectError(await refresh(first.body.refreshToken), 401, 'REFRESH_TOKEN_INVALID');
  });

  it('revoke the session when a spent token is replayed after the grace window', async () => {
    const user = await signIn(t);
    const rotated = await refresh(user.refreshToken);
    t.clock.advance(31_000);
    expectError(await refresh(user.refreshToken), 401, 'REFRESH_TOKEN_INVALID');

    const session = await prisma.session.findFirstOrThrow({ where: { userId: user.userId } });
    expect(session.revokeReason).toBe('REPLAY_DETECTED');
    expectError(await me(rotated.body.accessToken), 401, 'UNAUTHENTICATED');
    expectError(await refresh(rotated.body.refreshToken), 401, 'REFRESH_TOKEN_INVALID');
  });

  it('reject an unknown token without touching live sessions', async () => {
    const user = await signIn(t);
    expectError(await refresh('x'.repeat(43)), 401, 'REFRESH_TOKEN_INVALID');
    expect((await me(user.token)).status).toBe(200);
  });

  it('expire after 30 idle days', async () => {
    const user = await signIn(t);
    t.clock.advance(31 * 86_400_000);
    expectError(await refresh(user.refreshToken), 401, 'REFRESH_TOKEN_INVALID');
  });

  it('never outlive the 90-day absolute limit', async () => {
    const user = await signIn(t);
    let token = user.refreshToken;
    for (let day = 0; day < 3; day++) {
      t.clock.advance(29 * 86_400_000);
      const res = await refresh(token);
      expect(res.status).toBe(200);
      token = res.body.refreshToken;
      expect(new Date(res.body.refreshTokenExpiresAt).getTime()).toBeLessThanOrEqual(
        new Date('2026-10-22T06:30:00.000Z').getTime() + 90 * 86_400_000,
      );
    }
    t.clock.advance(4 * 86_400_000);
    expectError(await refresh(token), 401, 'REFRESH_TOKEN_INVALID');
  });
});

describe('access tokens', () => {
  it('expire after 15 minutes', async () => {
    const user = await signIn(t);
    t.clock.advance(14 * 60_000);
    expect((await me(user.token)).status).toBe(200);
    t.clock.advance(2 * 60_000);
    expectError(await me(user.token), 401, 'UNAUTHENTICATED');
    expect((await refresh(user.refreshToken)).status).toBe(200);
  });
});
