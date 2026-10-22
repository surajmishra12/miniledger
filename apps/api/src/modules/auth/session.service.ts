/**
 * App-owned sessions: JWT access tokens + rotating opaque refresh tokens (architecture.md §7.3).
 */
import { randomUUID } from 'node:crypto';

import type { TokenPairDto } from '@miniledger/shared';

import type { AppContext } from '../../context';
import { TX_OPTIONS } from '../../context';
import type { Prisma, User } from '../../generated/prisma/client';
import { generateRefreshToken, hmacHex } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import { signAccessToken, verifyAccessToken } from '../../lib/jwt';

const DAY_MS = 86_400_000;
export const REFRESH_IDLE_MS = 30 * DAY_MS;
export const SESSION_ABSOLUTE_MS = 90 * DAY_MS;
export const REFRESH_GRACE_MS = 30_000;

type Tx = Prisma.TransactionClient;

const invalidRefresh = () =>
  new AppError('REFRESH_TOKEN_INVALID', 'Your session has ended. Please sign in again.');

export function createSessionService(ctx: AppContext) {
  const { env, prisma, clock } = ctx;
  const digest = (token: string) => hmacHex(env.REFRESH_TOKEN_HMAC_SECRET, token);

  async function issuePair(
    userId: string,
    sessionId: string,
    refreshToken: string,
    refreshExpiresAt: Date,
    now: Date,
  ): Promise<TokenPairDto> {
    const access = await signAccessToken(env.JWT_SECRET, { userId, sessionId }, now);
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    };
  }

  /** Creates a session inside the caller's transaction (used by OTP login). */
  async function createSession(tx: Tx, userId: string): Promise<TokenPairDto> {
    const now = clock.now();
    const id = randomUUID();
    const refreshToken = generateRefreshToken();
    const absoluteExpiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);
    const refreshExpiresAt = new Date(now.getTime() + REFRESH_IDLE_MS);

    // Inline housekeeping (architecture.md §13): drop a bounded batch of dead sessions.
    await tx.$executeRaw`
      DELETE FROM sessions WHERE id IN (
        SELECT id FROM sessions
        WHERE revoked_at IS NOT NULL OR absolute_expires_at < ${now}
        LIMIT 100
      )`;

    await tx.session.create({
      data: {
        id,
        userId,
        refreshTokenDigest: digest(refreshToken),
        refreshExpiresAt,
        absoluteExpiresAt,
        createdAt: now,
      },
    });
    return issuePair(userId, id, refreshToken, refreshExpiresAt, now);
  }

  type SessionRow = {
    id: string;
    user_id: string;
    refresh_token_digest: string;
    previous_refresh_token_digest: string | null;
    rotated_at: Date | null;
    refresh_expires_at: Date;
    absolute_expires_at: Date;
    revoked_at: Date | null;
  };

  /** Rotates a refresh token; detects replay of the previous token (architecture.md §7.3). */
  async function refresh(refreshToken: string): Promise<TokenPairDto> {
    const presented = digest(refreshToken);

    const outcome = await prisma.$transaction(async (tx) => {
      const now = clock.now();
      const [session] = await tx.$queryRaw<SessionRow[]>`
        SELECT id, user_id, refresh_token_digest, previous_refresh_token_digest, rotated_at,
               refresh_expires_at, absolute_expires_at, revoked_at
        FROM sessions
        WHERE refresh_token_digest = ${presented} OR previous_refresh_token_digest = ${presented}
        FOR UPDATE`;

      if (!session) return { ok: false as const };
      if (
        session.revoked_at !== null ||
        session.refresh_expires_at <= now ||
        session.absolute_expires_at <= now
      ) {
        return { ok: false as const };
      }

      const nextToken = generateRefreshToken();
      const nextExpiresAt = new Date(
        Math.min(now.getTime() + REFRESH_IDLE_MS, session.absolute_expires_at.getTime()),
      );

      if (session.refresh_token_digest === presented) {
        await tx.session.update({
          where: { id: session.id },
          data: {
            previousRefreshTokenDigest: presented,
            refreshTokenDigest: digest(nextToken),
            rotatedAt: now,
            refreshExpiresAt: nextExpiresAt,
          },
        });
      } else {
        const withinGrace =
          session.rotated_at !== null &&
          now.getTime() - session.rotated_at.getTime() <= REFRESH_GRACE_MS;
        if (!withinGrace) {
          // A spent token came back after the grace window: treat as theft.
          await tx.session.update({
            where: { id: session.id },
            data: { revokedAt: now, revokeReason: 'REPLAY_DETECTED' },
          });
          return { ok: false as const };
        }
        // Lost refresh response: issue a fresh successor; the undelivered one becomes useless.
        await tx.session.update({
          where: { id: session.id },
          data: { refreshTokenDigest: digest(nextToken), refreshExpiresAt: nextExpiresAt },
        });
      }

      return {
        ok: true as const,
        pair: await issuePair(session.user_id, session.id, nextToken, nextExpiresAt, now),
      };
    }, TX_OPTIONS);

    if (!outcome.ok) throw invalidRefresh();
    return outcome.pair;
  }

  async function logout(sessionId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: clock.now(), revokeReason: 'LOGOUT' },
    });
  }

  /** Validates an access token and its live session; returns the session's user. */
  async function authenticate(accessToken: string): Promise<{ user: User; sessionId: string }> {
    const now = clock.now();
    const claims = await verifyAccessToken(env.JWT_SECRET, accessToken, now);
    const unauthenticated = new AppError('UNAUTHENTICATED', 'Sign in to continue.');
    if (!claims) throw unauthenticated;

    const session = await prisma.session.findUnique({
      where: { id: claims.sessionId },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== claims.userId ||
      session.revokedAt !== null ||
      session.absoluteExpiresAt <= now
    ) {
      throw unauthenticated;
    }
    return { user: session.user, sessionId: session.id };
  }

  return { createSession, refresh, logout, authenticate };
}

export type SessionService = ReturnType<typeof createSessionService>;
