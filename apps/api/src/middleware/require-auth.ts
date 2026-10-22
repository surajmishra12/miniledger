/**
 * Protects a router: verifies the bearer token and live session, then exposes req.auth.
 */
import type { RequestHandler } from 'express';

import type { User } from '../generated/prisma/client';
import { AppError } from '../lib/errors';
import type { SessionService } from '../modules/auth/session.service';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: { user: User; sessionId: string };
  }
}

export function requireAuth(sessions: SessionService): RequestHandler {
  return async (req, _res, next) => {
    const header = req.get('authorization');
    const match = header ? /^Bearer\s+(\S+)$/i.exec(header) : null;
    if (!match?.[1]) {
      next(new AppError('UNAUTHENTICATED', 'Sign in to continue.'));
      return;
    }
    req.auth = await sessions.authenticate(match[1]);
    next();
  };
}

/** The authenticated context; only valid on routes behind requireAuth. */
export function authOf(req: Parameters<RequestHandler>[0]): { user: User; sessionId: string } {
  if (!req.auth) throw new AppError('UNAUTHENTICATED', 'Sign in to continue.');
  return req.auth;
}
