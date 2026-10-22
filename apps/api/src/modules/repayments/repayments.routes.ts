import { createRepaymentSchema, patchRepaymentSchema } from '@miniledger/shared';
import { Router } from 'express';

import { routeId } from '../../lib/ids';
import { authOf } from '../../middleware/require-auth';
import type { RepaymentsService } from './repayments.service';

/** Mounted at /v1/loans/:id/repayments. */
export function createRepaymentRoutes(repayments: RepaymentsService): Router {
  const router = Router({ mergeParams: true });

  router.post('/', async (req, res) => {
    const loanId = routeId((req.params as { id?: string }).id);
    const input = createRepaymentSchema.parse(req.body);
    const { status, body } = await repayments.create(authOf(req).user, loanId, input);
    res.status(status).json(body);
  });

  router.patch('/:repaymentId', async (req, res) => {
    const params = req.params as { id?: string; repaymentId?: string };
    const loanId = routeId(params.id);
    const repaymentId = routeId(params.repaymentId);
    const input = patchRepaymentSchema.parse(req.body);
    res.json(await repayments.update(authOf(req).user, loanId, repaymentId, input));
  });

  router.delete('/:repaymentId', async (req, res) => {
    const params = req.params as { id?: string; repaymentId?: string };
    await repayments.remove(authOf(req).user, routeId(params.id), routeId(params.repaymentId));
    res.status(204).end();
  });

  return router;
}
