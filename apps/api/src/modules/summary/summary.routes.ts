/**
 * GET /v1/summary — exact lent/borrowed totals (PRD FR-05, architecture.md §4.4).
 * totalLent, totalRepaid and overdueAmount always refer to LENT loans only.
 */
import type { SummaryDto } from '@miniledger/shared';
import { Router } from 'express';

import type { AppContext } from '../../context';
import { todayIn } from '../../lib/dates';
import { toSafeInteger } from '../../lib/numbers';
import { authOf } from '../../middleware/require-auth';

type SummaryRow = Record<
  | 'total_lent'
  | 'total_repaid'
  | 'overdue_amount'
  | 'total_borrowed'
  | 'total_returned'
  | 'overdue_borrowed',
  unknown
>;

export function createSummaryRoutes(ctx: AppContext): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const { user } = authOf(req);
    const asOfDate = todayIn(user.timezone, ctx.clock.now());

    const [row] = await ctx.prisma.$queryRaw<SummaryRow[]>`
      SELECT
        COALESCE(SUM(principal_paise) FILTER (WHERE direction = 'LENT'), 0) AS total_lent,
        COALESCE(SUM(repaid) FILTER (WHERE direction = 'LENT'), 0) AS total_repaid,
        COALESCE(SUM(principal_paise - repaid) FILTER (
          WHERE direction = 'LENT' AND principal_paise > repaid AND due_date < ${asOfDate}::date
        ), 0) AS overdue_amount,
        COALESCE(SUM(principal_paise) FILTER (WHERE direction = 'BORROWED'), 0) AS total_borrowed,
        COALESCE(SUM(repaid) FILTER (WHERE direction = 'BORROWED'), 0) AS total_returned,
        COALESCE(SUM(principal_paise - repaid) FILTER (
          WHERE direction = 'BORROWED' AND principal_paise > repaid AND due_date < ${asOfDate}::date
        ), 0) AS overdue_borrowed
      FROM (
        SELECT l.direction, l.principal_paise, l.due_date, COALESCE(r.repaid, 0) AS repaid
        FROM loans l
        LEFT JOIN (
          SELECT loan_id, SUM(amount_paise) AS repaid
          FROM repayments WHERE user_id = ${user.id}::uuid GROUP BY loan_id
        ) r ON r.loan_id = l.id
        WHERE l.user_id = ${user.id}::uuid
      ) AS ledger`;

    const totalLent = toSafeInteger(row?.total_lent);
    const totalRepaid = toSafeInteger(row?.total_repaid);
    const totalBorrowed = toSafeInteger(row?.total_borrowed);
    const totalReturned = toSafeInteger(row?.total_returned);
    const body: SummaryDto = {
      totalLent,
      totalRepaid,
      overdueAmount: toSafeInteger(row?.overdue_amount),
      outstandingLent: totalLent - totalRepaid,
      totalBorrowed,
      totalReturned,
      outstandingBorrowed: totalBorrowed - totalReturned,
      overdueBorrowed: toSafeInteger(row?.overdue_borrowed),
      currency: 'INR',
      unit: 'paise',
      asOfDate,
      timezone: user.timezone,
    };
    res.json(body);
  });

  return router;
}
