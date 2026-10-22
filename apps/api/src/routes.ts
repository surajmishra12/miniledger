import type { HealthResponse } from '@miniledger/shared';
import { Router } from 'express';

import type { AppContext } from './context';
import { requireAuth } from './middleware/require-auth';
import { createAuthRoutes } from './modules/auth/auth.routes';
import { createOtpService } from './modules/auth/otp.service';
import { createSessionService } from './modules/auth/session.service';
import { createLoanRoutes } from './modules/loans/loans.routes';
import { createLoansService } from './modules/loans/loans.service';
import { createPeopleRoutes } from './modules/people/people.routes';
import { createPeopleService } from './modules/people/people.service';
import { createRepaymentsService } from './modules/repayments/repayments.service';
import { createSummaryRoutes } from './modules/summary/summary.routes';
import { createUserRoutes } from './modules/users/users.routes';

export function createRoutes(ctx: AppContext): Router {
  const router = Router();

  // Liveness only — never touches the database (architecture.md §13).
  router.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok', version: ctx.version };
    res.json(body);
  });

  const sessions = createSessionService(ctx);
  const otp = createOtpService(ctx, sessions);
  const auth = requireAuth(sessions);

  const v1 = Router();
  v1.use('/auth', createAuthRoutes(ctx, otp, sessions, auth));
  v1.use('/me', auth, createUserRoutes(ctx));
  v1.use('/people', auth, createPeopleRoutes(createPeopleService(ctx)));
  v1.use('/loans', auth, createLoanRoutes(createLoansService(ctx), createRepaymentsService(ctx)));
  v1.use('/summary', auth, createSummaryRoutes(ctx));
  router.use('/v1', v1);

  return router;
}
