import { healthResponseSchema } from '@miniledger/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createTestApp, expectError } from '../helpers';

const { app } = createTestApp();

describe('HTTP baseline', () => {
  it('GET /health returns status and version without a database', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(healthResponseSchema.parse(res.body)).toEqual({ status: 'ok', version: '1.0.0-test' });
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('echoes a valid X-Request-Id and replaces an invalid one', async () => {
    const id = '7ba196b6-5846-4b20-9448-d5b32eb3b0fa';
    const echoed = await request(app).get('/health').set('X-Request-Id', id);
    expect(echoed.headers['x-request-id']).toBe(id);
    const replaced = await request(app).get('/health').set('X-Request-Id', 'nope');
    expect(replaced.headers['x-request-id']).not.toBe('nope');
  });

  it('returns 404 in the standard envelope for unknown routes', async () => {
    expectError(await request(app).get('/v1/does-not-exist'), 404, 'NOT_FOUND');
  });

  it('returns 400 MALFORMED_JSON for invalid JSON', async () => {
    const res = await request(app)
      .post('/v1/auth/otp/request')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expectError(res, 400, 'MALFORMED_JSON');
  });

  it('returns 415 for non-JSON bodies', async () => {
    const res = await request(app)
      .post('/v1/auth/otp/request')
      .set('Content-Type', 'text/plain')
      .send('hi');
    expectError(res, 415, 'UNSUPPORTED_MEDIA_TYPE');
  });

  it('returns 413 for bodies over 16 KB', async () => {
    const res = await request(app)
      .post('/v1/auth/otp/request')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ identifier: 'x'.repeat(17 * 1024) }));
    expectError(res, 413, 'PAYLOAD_TOO_LARGE');
  });

  it('returns 401 for protected routes without a valid token', async () => {
    expectError(await request(app).get('/v1/me'), 401, 'UNAUTHENTICATED');
    expectError(
      await request(app).get('/v1/loans').set('Authorization', 'Bearer not-a-jwt'),
      401,
      'UNAUTHENTICATED',
    );
  });
});
