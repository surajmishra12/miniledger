import { describe, expect, it, vi } from 'vitest';

import { createResendDelivery, RESEND_ENDPOINT } from '../../src/lib/otp-delivery';

const message = {
  challengeId: '6f1c2b1e-8a43-4c1e-9f0a-1b2c3d4e5f60',
  identifierType: 'EMAIL' as const,
  identifier: 'someone@example.com',
  code: '123456',
};

describe('createResendDelivery', () => {
  it('posts one email with only the code, keyed by the challenge ID', async () => {
    const fetch = vi.fn(async () => new Response('{"id":"x"}', { status: 200 }));
    const delivery = createResendDelivery({
      apiKey: 're_test',
      from: 'MiniLedger <no-reply@mail.example.com>',
      fetch,
    });
    await delivery.send(message);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(RESEND_ENDPOINT);
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer re_test',
      'Idempotency-Key': `otp-${message.challengeId}`,
    });
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      from: 'MiniLedger <no-reply@mail.example.com>',
      to: ['someone@example.com'],
      subject: 'Your MiniLedger code',
    });
    expect(body.text).toContain('123456');
    expect(body.text).toContain('expires in 5 minutes');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects on an error status without echoing the response body', async () => {
    const fetch = vi.fn(
      async () => new Response('{"message":"someone@example.com is invalid"}', { status: 422 }),
    );
    const delivery = createResendDelivery({ apiKey: 'k', from: 'f@example.com', fetch });
    await expect(delivery.send(message)).rejects.toThrow('Resend responded with HTTP 422');
    await expect(delivery.send(message)).rejects.not.toThrow(/someone@/);
  });

  it('rejects when Resend does not answer within the timeout', async () => {
    const fetch = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );
    const delivery = createResendDelivery({
      apiKey: 'k',
      from: 'f@example.com',
      fetch,
      timeoutMs: 20,
    });
    await expect(delivery.send(message)).rejects.toThrow();
  });

  it('refuses phone destinations', async () => {
    const fetch = vi.fn();
    const delivery = createResendDelivery({ apiKey: 'k', from: 'f@example.com', fetch });
    await expect(delivery.send({ ...message, identifierType: 'PHONE' })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
