/**
 * OTP delivery adapters (architecture.md §7.2).
 * Assignment mode prints the code to the local server log; production emails it via Resend.
 */
import type { Logger } from './logger';

export type OtpMessage = {
  challengeId: string;
  identifierType: 'PHONE' | 'EMAIL';
  identifier: string;
  code: string;
};

export type OtpDelivery = { send(message: OtpMessage): Promise<void> };

/** Writes the code to the server log — the assignment's "mock OTP". Never used in production. */
export function createLogDelivery(logger: Logger): OtpDelivery {
  return {
    async send({ challengeId, identifier, code }) {
      logger.info(`MiniLedger mock OTP [${challengeId}] for ${identifier}: ${code}`);
    },
  };
}

export const RESEND_ENDPOINT = 'https://api.resend.com/emails';
export const RESEND_TIMEOUT_MS = 10_000;

/** The email: only the code and its lifetime (architecture.md §7.2). */
export function otpEmail(code: string) {
  return {
    subject: 'Your MiniLedger code',
    text: `Your MiniLedger code is ${code}. It expires in 5 minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: `<p>Your MiniLedger code is</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>It expires in 5 minutes.</p><p style="color:#6b6b6b">If you didn't request this, you can ignore this email.</p>`,
  };
}

/**
 * Resend's REST API with a hard timeout. Any non-2xx, network error or timeout rejects, so the
 * caller marks the challenge FAILED and never reports an undelivered code as sent.
 * The challenge ID is the idempotency key: a retried call cannot send a second email.
 */
export function createResendDelivery(options: {
  apiKey: string;
  from: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
}): OtpDelivery {
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? RESEND_TIMEOUT_MS;
  return {
    async send({ challengeId, identifierType, identifier, code }) {
      if (identifierType !== 'EMAIL') throw new Error('Resend delivers email codes only');
      const response = await doFetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `otp-${challengeId}`,
        },
        body: JSON.stringify({ from: options.from, to: [identifier], ...otpEmail(code) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        // The body may echo the address; report the status only.
        throw new Error(`Resend responded with HTTP ${response.status}`);
      }
    },
  };
}
