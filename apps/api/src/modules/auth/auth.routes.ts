import {
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
  type AuthConfigDto,
} from '@miniledger/shared';
import { Router, type RequestHandler } from 'express';

import type { AppContext } from '../../context';
import { authOf } from '../../middleware/require-auth';
import { OTP_TTL_SECONDS, RESEND_COOLDOWN_SECONDS, type OtpService } from './otp.service';
import type { SessionService } from './session.service';

export function createAuthRoutes(
  ctx: AppContext,
  otp: OtpService,
  sessions: SessionService,
  auth: RequestHandler,
): Router {
  const router = Router();

  router.get('/config', (_req, res) => {
    const body: AuthConfigDto = {
      authMode: ctx.env.AUTH_MODE,
      identifierType: ctx.env.AUTH_MODE === 'assignment' ? 'PHONE' : 'EMAIL',
      otpLength: 6,
      otpTtlSeconds: OTP_TTL_SECONDS,
      resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
    };
    res.json(body);
  });

  router.post('/otp/request', async (req, res) => {
    const { identifier } = otpRequestSchema.parse(req.body);
    res.json(await otp.requestLoginCode(identifier, req.ip ?? 'unknown'));
  });

  router.post('/otp/verify', async (req, res) => {
    const body = otpVerifySchema.parse(req.body);
    res.json(await otp.verifyLogin(body));
  });

  router.post('/refresh', async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    res.json(await sessions.refresh(refreshToken));
  });

  router.post('/logout', auth, async (req, res) => {
    await sessions.logout(authOf(req).sessionId);
    res.status(204).end();
  });

  return router;
}
