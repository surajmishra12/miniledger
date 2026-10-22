/**
 * OTP request and verification (architecture.md §7.2).
 * Limits are counted from otp_challenges itself; no separate rate-limit table.
 */
import { randomUUID } from 'node:crypto';

import {
  IDENTIFIER_MESSAGES,
  maskEmail,
  maskPhone,
  normalizeEmail,
  normalizePhone,
  type ChallengeDto,
  type VerifyResponse,
} from '@miniledger/shared';

import type { AppContext } from '../../context';
import { TX_OPTIONS } from '../../context';
import type { IdentifierType, OtpPurpose, User } from '../../generated/prisma/client';
import { digestsEqual, generateOtpCode, hmacHex } from '../../lib/crypto';
import { canonicalTimeZone, DEFAULT_TIMEZONE } from '../../lib/dates';
import { AppError, validationError } from '../../lib/errors';
import { toUserDto } from '../users/user.dto';
import type { SessionService } from './session.service';

export const OTP_TTL_SECONDS = 300;
export const RESEND_COOLDOWN_SECONDS = 60;
export const MAX_ATTEMPTS = 5;
const PER_IDENTIFIER_PER_HOUR = 5;
const PER_IP_PER_HOUR = 20;
const HOUR_MS = 3_600_000;
const HOUSEKEEPING_AGE_MS = 24 * HOUR_MS;

type ChallengeRow = {
  id: string;
  purpose: OtpPurpose;
  identifier_type: IdentifierType;
  identifier: string;
  session_id: string | null;
  code_digest: string;
  attempts: number;
  state: string;
  expires_at: Date;
};

const retryAfter = (until: Date, now: Date) =>
  String(Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 1000)));

export function createOtpService(ctx: AppContext, sessions: SessionService) {
  const { env, prisma, clock, delivery, logger } = ctx;
  const identifierType: IdentifierType = env.AUTH_MODE === 'assignment' ? 'PHONE' : 'EMAIL';

  const codeDigest = (challengeId: string, code: string) =>
    hmacHex(env.OTP_HMAC_SECRET, `${challengeId}:${code}`);
  const ipHash = (ip: string) => hmacHex(env.OTP_HMAC_SECRET, `ip:${ip}`);
  const mask = (identifier: string) =>
    identifierType === 'PHONE' ? maskPhone(identifier) : maskEmail(identifier);

  /** Normalizes for the server's mode; a phone in production (or email in assignment) is rejected. */
  function normalizeIdentifier(raw: string): string {
    const value = identifierType === 'PHONE' ? normalizePhone(raw) : normalizeEmail(raw);
    if (value === null) {
      throw validationError(
        'identifier',
        identifierType === 'PHONE' ? IDENTIFIER_MESSAGES.phone : IDENTIFIER_MESSAGES.email,
      );
    }
    return value;
  }

  async function issueChallenge(params: {
    purpose: OtpPurpose;
    identifier: string;
    ip: string;
    sessionId: string | null;
  }): Promise<ChallengeDto> {
    const { purpose, identifier, sessionId } = params;
    const code = generateOtpCode();
    const id = randomUUID();
    const hashedIp = ipHash(params.ip);

    const created = await prisma.$transaction(async (tx) => {
      const now = clock.now();
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${identifierType}:${identifier}`}))`;

      // Bounded housekeeping (architecture.md §13).
      await tx.$executeRaw`
        DELETE FROM otp_challenges WHERE id IN (
          SELECT id FROM otp_challenges WHERE created_at < ${new Date(now.getTime() - HOUSEKEEPING_AGE_MS)}
          LIMIT 100
        )`;

      const latest = await tx.otpChallenge.findFirst({
        where: { identifierType, identifier, purpose, state: { not: 'FAILED' } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      if (latest) {
        const availableAt = new Date(latest.createdAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000);
        if (availableAt > now) {
          throw new AppError(
            'OTP_RESEND_COOLDOWN',
            'Please wait before requesting another code.',
            {},
            { retryAfterSeconds: Number(retryAfter(availableAt, now)) },
            { 'Retry-After': retryAfter(availableAt, now) },
          );
        }
      }

      const windowStart = new Date(now.getTime() - HOUR_MS);
      const recentForIdentifier = await tx.otpChallenge.findMany({
        where: { identifierType, identifier, createdAt: { gte: windowStart } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });
      if (recentForIdentifier.length >= PER_IDENTIFIER_PER_HOUR) {
        const until = new Date(recentForIdentifier[0]!.createdAt.getTime() + HOUR_MS);
        throw new AppError(
          'RATE_LIMITED',
          'Too many codes requested.',
          {},
          {},
          {
            'Retry-After': retryAfter(until, now),
          },
        );
      }

      const recentForIp = await tx.otpChallenge.findMany({
        where: { ipHash: hashedIp, createdAt: { gte: windowStart } },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });
      if (recentForIp.length >= PER_IP_PER_HOUR) {
        const until = new Date(recentForIp[0]!.createdAt.getTime() + HOUR_MS);
        throw new AppError(
          'RATE_LIMITED',
          'Too many codes requested.',
          {},
          {},
          {
            'Retry-After': retryAfter(until, now),
          },
        );
      }

      if (env.AUTH_MODE === 'production') {
        const utcMidnight = new Date(now.toISOString().slice(0, 10) + 'T00:00:00.000Z');
        const sentToday = await tx.otpChallenge.count({
          where: { createdAt: { gte: utcMidnight }, state: { not: 'FAILED' } },
        });
        if (sentToday >= env.OTP_DAILY_SEND_LIMIT) {
          throw new AppError('OTP_DAILY_LIMIT_REACHED', 'Sign-in is temporarily unavailable.');
        }
      }

      await tx.otpChallenge.updateMany({
        where: { identifierType, identifier, purpose, state: { in: ['PENDING', 'ACTIVE'] } },
        data: { state: 'INVALIDATED' },
      });

      return tx.otpChallenge.create({
        data: {
          id,
          purpose,
          identifierType,
          identifier,
          ipHash: hashedIp,
          sessionId,
          codeDigest: codeDigest(id, code),
          state: 'PENDING',
          expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
          createdAt: now,
        },
      });
    }, TX_OPTIONS);

    try {
      await delivery.send({ challengeId: id, identifierType, identifier, code });
    } catch (error) {
      logger.error({ err: error, challengeId: id }, 'OTP delivery failed');
      await prisma.otpChallenge.update({ where: { id }, data: { state: 'FAILED' } });
      throw new AppError('OTP_DELIVERY_FAILED', "We couldn't send the code. Please try again.");
    }
    await prisma.otpChallenge.updateMany({
      where: { id, state: 'PENDING' },
      data: { state: 'ACTIVE' },
    });

    return {
      challengeId: id,
      expiresAt: created.expiresAt.toISOString(),
      resendAvailableAt: new Date(
        created.createdAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000,
      ).toISOString(),
      maskedDestination: mask(identifier),
    };
  }

  type CheckResult = { ok: true; challenge: ChallengeRow } | { ok: false; error: AppError };

  /**
   * Checks a code under a row lock and records the attempt. Runs in its own transaction so a
   * wrong-attempt increment is committed even though the request fails.
   */
  async function consumeChallenge(params: {
    challengeId: string;
    code: string;
    purpose: OtpPurpose;
    sessionId: string | null;
  }): Promise<ChallengeRow> {
    const result: CheckResult = await prisma.$transaction(async (tx) => {
      const now = clock.now();
      const [challenge] = await tx.$queryRaw<ChallengeRow[]>`
        SELECT id, purpose, identifier_type, identifier, session_id, code_digest, attempts,
               state::text AS state, expires_at
        FROM otp_challenges WHERE id = ${params.challengeId}::uuid
        FOR UPDATE`;

      const invalid = (details: Record<string, unknown> = {}) =>
        new AppError('OTP_INVALID', "That code isn't right.", {}, details);

      if (
        !challenge ||
        challenge.purpose !== params.purpose ||
        challenge.identifier_type !== identifierType ||
        (params.purpose === 'REAUTH' && challenge.session_id !== params.sessionId)
      ) {
        return { ok: false, error: invalid() };
      }
      if (challenge.attempts >= MAX_ATTEMPTS) {
        return {
          ok: false,
          error: new AppError('OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts.'),
        };
      }
      if (challenge.state !== 'ACTIVE') return { ok: false, error: invalid() };
      if (challenge.expires_at <= now) {
        return { ok: false, error: new AppError('OTP_EXPIRED', 'This code has expired.') };
      }

      if (!digestsEqual(challenge.code_digest, codeDigest(challenge.id, params.code))) {
        const attempts = challenge.attempts + 1;
        const exhausted = attempts >= MAX_ATTEMPTS;
        await tx.otpChallenge.update({
          where: { id: challenge.id },
          data: { attempts, ...(exhausted ? { state: 'INVALIDATED' as const } : {}) },
        });
        return {
          ok: false,
          error: exhausted
            ? new AppError('OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts.')
            : invalid({ attemptsRemaining: MAX_ATTEMPTS - attempts }),
        };
      }

      await tx.otpChallenge.update({ where: { id: challenge.id }, data: { state: 'CONSUMED' } });
      return { ok: true, challenge };
    }, TX_OPTIONS);

    if (!result.ok) throw result.error;
    return result.challenge;
  }

  async function requestLoginCode(rawIdentifier: string, ip: string): Promise<ChallengeDto> {
    const identifier = normalizeIdentifier(rawIdentifier);
    return issueChallenge({ purpose: 'LOGIN', identifier, ip, sessionId: null });
  }

  async function verifyLogin(params: {
    challengeId: string;
    code: string;
    timezone?: string | undefined;
  }): Promise<VerifyResponse> {
    const challenge = await consumeChallenge({
      challengeId: params.challengeId,
      code: params.code,
      purpose: 'LOGIN',
      sessionId: null,
    });
    // An invalid timezone never blocks sign-in (architecture.md §4.5).
    const timezone = params.timezone ? canonicalTimeZone(params.timezone) : null;

    return prisma.$transaction(async (tx) => {
      const now = clock.now();
      const inserted = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO users (id, identifier_type, identifier, timezone, created_at, updated_at)
        VALUES (${randomUUID()}::uuid, ${challenge.identifier_type}::"IdentifierType",
                ${challenge.identifier}, ${timezone ?? DEFAULT_TIMEZONE}, ${now}, ${now})
        ON CONFLICT (identifier_type, identifier) DO NOTHING
        RETURNING id`;
      const isNewUser = inserted.length === 1;

      let user = await tx.user.findUniqueOrThrow({
        where: {
          identifierType_identifier: {
            identifierType: challenge.identifier_type,
            identifier: challenge.identifier,
          },
        },
      });
      if (!isNewUser && timezone !== null && timezone !== user.timezone) {
        user = await tx.user.update({ where: { id: user.id }, data: { timezone } });
      }

      const tokens = await sessions.createSession(tx, user.id);
      return { user: toUserDto(user), tokens, isNewUser };
    }, TX_OPTIONS);
  }

  /** Account-deletion code, sent to the signed-in user's own identifier and bound to the session. */
  async function requestReauthCode(user: User, sessionId: string, ip: string) {
    return issueChallenge({ purpose: 'REAUTH', identifier: user.identifier, ip, sessionId });
  }

  return { requestLoginCode, verifyLogin, requestReauthCode, issueChallenge, consumeChallenge };
}

export type OtpService = ReturnType<typeof createOtpService>;
