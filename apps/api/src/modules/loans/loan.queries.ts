/**
 * The single loan read query (architecture.md §6.5): joins the person and a per-loan repayment sum,
 * computes outstanding and the attention bucket using the server's "today".
 */
import { daysBetween, type LoanDto, type RepaymentDto } from '@miniledger/shared';

import { Prisma, type PrismaClient, type Repayment } from '../../generated/prisma/client';
import { fromDbDate } from '../../lib/dates';
import { toSafeInteger } from '../../lib/numbers';

export type Db = PrismaClient | Prisma.TransactionClient;

export type LoanRow = {
  id: string;
  person_id: string;
  person_name: string;
  person_archived: boolean;
  direction: 'LENT' | 'BORROWED';
  principal_paise: unknown;
  repaid_paise: unknown;
  outstanding_paise: unknown;
  bucket: number;
  loan_date: string;
  due_date: string;
  note: string | null;
  version: number;
  last_activity_at: Date;
  created_at: Date;
  updated_at: Date;
};

/** bucket: 0 = overdue, 1 = outstanding (not overdue), 2 = repaid. */
export const BUCKET_OVERDUE = 0;
export const BUCKET_REPAID = 2;

export async function queryLoans(
  db: Db,
  params: {
    userId: string;
    today: string;
    where?: Prisma.Sql;
    having?: Prisma.Sql;
    orderBy: Prisma.Sql;
    limit?: number;
  },
): Promise<LoanRow[]> {
  const { userId, today } = params;
  return db.$queryRaw<LoanRow[]>`
    WITH base AS (
      SELECT l.id, l.person_id, p.name AS person_name, (p.archived_at IS NOT NULL) AS person_archived,
             l.direction::text AS direction, l.principal_paise,
             COALESCE(r.repaid, 0)::bigint AS repaid_paise,
             l.loan_date, l.due_date, l.note, l.version, l.last_activity_at, l.created_at, l.updated_at
      FROM loans l
      JOIN people p ON p.id = l.person_id AND p.user_id = l.user_id
      LEFT JOIN (
        SELECT loan_id, SUM(amount_paise) AS repaid
        FROM repayments WHERE user_id = ${userId}::uuid GROUP BY loan_id
      ) r ON r.loan_id = l.id
      WHERE l.user_id = ${userId}::uuid ${params.where ?? Prisma.empty}
    ), calc AS (
      SELECT *, principal_paise - repaid_paise AS outstanding_paise,
             CASE WHEN principal_paise - repaid_paise = 0 THEN 2
                  WHEN due_date < ${today}::date THEN 0
                  ELSE 1 END AS bucket
      FROM base
    )
    SELECT id, person_id, person_name, person_archived, direction, principal_paise, repaid_paise,
           outstanding_paise, bucket,
           to_char(loan_date, 'YYYY-MM-DD') AS loan_date, to_char(due_date, 'YYYY-MM-DD') AS due_date,
           note, version, last_activity_at, created_at, updated_at
    FROM calc
    WHERE TRUE ${params.having ?? Prisma.empty}
    ORDER BY ${params.orderBy}
    ${params.limit !== undefined ? Prisma.sql`LIMIT ${params.limit}::int` : Prisma.empty}`;
}

export function toLoanDto(row: LoanRow, today: string): LoanDto {
  const principalPaise = toSafeInteger(row.principal_paise);
  const repaidPaise = toSafeInteger(row.repaid_paise);
  const outstandingPaise = toSafeInteger(row.outstanding_paise);
  const isOverdue = row.bucket === BUCKET_OVERDUE;
  return {
    id: row.id,
    person: { id: row.person_id, name: row.person_name, archived: row.person_archived },
    direction: row.direction,
    principalPaise,
    repaidPaise,
    outstandingPaise,
    repaymentStatus: outstandingPaise === 0 ? 'REPAID' : repaidPaise > 0 ? 'PARTIAL' : 'UNPAID',
    isOverdue,
    daysOverdue: isOverdue ? daysBetween(row.due_date, today) : 0,
    loanDate: row.loan_date,
    dueDate: row.due_date,
    note: row.note,
    version: row.version,
    lastActivityAt: row.last_activity_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    asOfDate: today,
  };
}

export async function getLoanDto(
  db: Db,
  userId: string,
  loanId: string,
  today: string,
): Promise<LoanDto | null> {
  const [row] = await queryLoans(db, {
    userId,
    today,
    where: Prisma.sql`AND l.id = ${loanId}::uuid`,
    orderBy: Prisma.sql`id`,
    limit: 1,
  });
  return row ? toLoanDto(row, today) : null;
}

export function toRepaymentDto(repayment: Repayment): RepaymentDto {
  return {
    id: repayment.id,
    loanId: repayment.loanId,
    amountPaise: toSafeInteger(repayment.amountPaise),
    paidOn: fromDbDate(repayment.paidOn),
    note: repayment.note,
    createdAt: repayment.createdAt.toISOString(),
    updatedAt: repayment.updatedAt.toISOString(),
  };
}

type LockedLoan = { id: string; principal_paise: bigint; direction: string; version: number };

/** Per-loan serialization (architecture.md §5.2): every money change takes this lock first. */
export async function lockLoan(
  db: Db,
  userId: string,
  loanId: string,
): Promise<{ principalPaise: number; repaidPaise: number; version: number } | null> {
  const [loan] = await db.$queryRaw<LockedLoan[]>`
    SELECT id, principal_paise, direction::text AS direction, version
    FROM loans WHERE id = ${loanId}::uuid AND user_id = ${userId}::uuid
    FOR UPDATE`;
  if (!loan) return null;
  const [sum] = await db.$queryRaw<{ repaid: unknown }[]>`
    SELECT COALESCE(SUM(amount_paise), 0) AS repaid FROM repayments WHERE loan_id = ${loanId}::uuid`;
  return {
    principalPaise: toSafeInteger(loan.principal_paise),
    repaidPaise: toSafeInteger(sum?.repaid),
    version: loan.version,
  };
}
