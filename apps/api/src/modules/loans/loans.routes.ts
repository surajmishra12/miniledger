import {
  createLoanSchema,
  loanListQuerySchema,
  patchLoanSchema,
  settleLoanSchema,
} from '@miniledger/shared';
import { Router } from 'express';

import { routeId } from '../../lib/ids';
import { authOf } from '../../middleware/require-auth';
import { createRepaymentRoutes } from '../repayments/repayments.routes';
import type { RepaymentsService } from '../repayments/repayments.service';
import type { LoansService } from './loans.service';

export function createLoanRoutes(loans: LoansService, repayments: RepaymentsService): Router {
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

  router.patch('/:id', async (req, res) => {
    const loanId = routeId(req.params.id);
    const input = patchLoanSchema.parse(req.body);
    res.json(await loans.update(authOf(req).user, loanId, input));
  });

  router.delete('/:id', async (req, res) => {
    await loans.remove(authOf(req).user, routeId(req.params.id));
    res.status(204).end();
  });

  router.post('/:id/settle', async (req, res) => {
    const loanId = routeId(req.params.id);
    const input = settleLoanSchema.parse(req.body ?? {});
    res.json(await loans.settle(authOf(req).user, loanId, input));
  });

  router.use('/:id/repayments', createRepaymentRoutes(repayments));

  return router;
}
