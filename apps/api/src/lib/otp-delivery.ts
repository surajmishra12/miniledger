/**
 * OTP delivery adapters (architecture.md §7.2).
 * Assignment mode prints the code to the local server log; production email arrives in Phase 4.
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

/** Placeholder until the Resend adapter exists: every send fails, so no OTP is ever reported sent. */
export const unavailableDelivery: OtpDelivery = {
  async send() {
    throw new Error('Email delivery is not configured');
  },
};
