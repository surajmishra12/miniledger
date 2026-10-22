import { createLoanSchema, loanListQuerySchema, settleLoanSchema } from '@miniledger/shared';
import { Router } from 'express';

import { routeId } from '../../lib/ids';
import { authOf } from '../../middleware/require-auth';
import type { LoansService } from './loans.service';

export function createLoanRoutes(loans: LoansService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const query = loanListQuerySchema.parse(req.query);
    res.json(await loans.list(authOf(req).user, query));
  });

  router.post('/', async (req, res) => {
    const input = createLoanSchema.parse(req.body);
    const { status, loan } = await loans.create(authOf(req).user, input);
    res.status(status).json(loan);
  });

  router.get('/:id', async (req, res) => {
    res.json(await loans.detail(authOf(req).user, routeId(req.params.id)));
  });

  router.post('/:id/settle', async (req, res) => {
    const loanId = routeId(req.params.id);
    const input = settleLoanSchema.parse(req.body ?? {});
    res.json(await loans.settle(authOf(req).user, loanId, input));
  });

  return router;
}
