/**
 * GET /v1/summary — exact lent/borrowed totals plus context counts (PRD FR-05, architecture.md §4.4).
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
  | 'overdue_borrowed'
  | 'people_owing_you'
  | 'people_you_owe'
  | 'lent_loans'
  | 'overdue_loans'
  | 'due_soon_lent'
  | 'due_soon_borrowed'
  | 'due_soon_loans',
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
        ), 0) AS overdue_borrowed,
        COUNT(DISTINCT person_id) FILTER (
          WHERE direction = 'LENT' AND principal_paise > repaid
        ) AS people_owing_you,
        COUNT(DISTINCT person_id) FILTER (
          WHERE direction = 'BORROWED' AND principal_paise > repaid
        ) AS people_you_owe,
        COUNT(*) FILTER (WHERE direction = 'LENT') AS lent_loans,
        COUNT(*) FILTER (
          WHERE direction = 'LENT' AND principal_paise > repaid AND due_date < ${asOfDate}::date
        ) AS overdue_loans,
        COALESCE(SUM(principal_paise - repaid) FILTER (
          WHERE direction = 'LENT' AND principal_paise > repaid
            AND due_date BETWEEN ${asOfDate}::date AND ${asOfDate}::date + 6
        ), 0) AS due_soon_lent,
        COALESCE(SUM(principal_paise - repaid) FILTER (
          WHERE direction = 'BORROWED' AND principal_paise > repaid
            AND due_date BETWEEN ${asOfDate}::date AND ${asOfDate}::date + 6
        ), 0) AS due_soon_borrowed,
        COUNT(*) FILTER (
          WHERE principal_paise > repaid
            AND due_date BETWEEN ${asOfDate}::date AND ${asOfDate}::date + 6
        ) AS due_soon_loans
      FROM (
        SELECT l.direction, l.person_id, l.principal_paise, l.due_date, COALESCE(r.repaid, 0) AS repaid
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
      peopleOwingYou: toSafeInteger(row?.people_owing_you),
      peopleYouOwe: toSafeInteger(row?.people_you_owe),
      lentLoans: toSafeInteger(row?.lent_loans),
      overdueLoans: toSafeInteger(row?.overdue_loans),
      dueSoonLent: toSafeInteger(row?.due_soon_lent),
      dueSoonBorrowed: toSafeInteger(row?.due_soon_borrowed),
      dueSoonLoans: toSafeInteger(row?.due_soon_loans),
      currency: 'INR',
      unit: 'paise',
      asOfDate,
      timezone: user.timezone,
    };
    res.json(body);
  });

  return router;
}
