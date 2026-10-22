/**
 * Loans: create (client ID + person resolution), list (filters, sorts, keyset cursor),
 * detail and settle (architecture.md §5, §6.4–6.5).
 */
import { randomUUID } from 'node:crypto';

import {
  DATE_MESSAGES,
  nameKey,
  type CreateLoanData,
  type LoanDetailDto,
  type LoanDto,
  type LoanListQuery,
  type LoanListResponse,
  type SettleResponse,
} from '@miniledger/shared';

import type { AppContext } from '../../context';
import { TX_OPTIONS } from '../../context';
import { Prisma, type Person, type User } from '../../generated/prisma/client';
import { fromDbDate, todayIn, toDbDate } from '../../lib/dates';
import { AppError, isUniqueViolation, notFound, validationError } from '../../lib/errors';
import { nameSearchPattern } from '../people/people.service';
import { decodeCursor, encodeCursor, type LoanCursor } from './cursor';
import {
  BUCKET_OVERDUE,
  BUCKET_REPAID,
  getLoanDto,
  lockLoan,
  queryLoans,
  toLoanDto,
  toRepaymentDto,
  type Db,
  type LoanRow,
} from './loan.queries';

const ORDER: Record<LoanListQuery['sort'], Prisma.Sql> = {
  attention: Prisma.sql`bucket ASC, due_date ASC, id ASC`,
  dueDate: Prisma.sql`due_date ASC, id ASC`,
  recent: Prisma.sql`last_activity_at DESC, id DESC`,
};

function keyset(cursor: LoanCursor): Prisma.Sql {
  switch (cursor.sort) {
    case 'attention': {
      const [bucket, dueDate, id] = cursor.after;
      return Prisma.sql`AND (bucket, due_date, id) > (${bucket}::int, ${dueDate}::date, ${id}::uuid)`;
    }
    case 'dueDate': {
      const [dueDate, id] = cursor.after;
      return Prisma.sql`AND (due_date, id) > (${dueDate}::date, ${id}::uuid)`;
    }
    case 'recent': {
      const [at, id] = cursor.after;
      return Prisma.sql`AND (last_activity_at, id) < (${at}::timestamptz, ${id}::uuid)`;
    }
  }
}

function cursorAfter(sort: LoanListQuery['sort'], row: LoanRow): LoanCursor {
  switch (sort) {
    case 'attention':
      return { v: 1, sort, after: [row.bucket, row.due_date, row.id] };
    case 'dueDate':
      return { v: 1, sort, after: [row.due_date, row.id] };
    case 'recent':
      return { v: 1, sort, after: [row.last_activity_at.toISOString(), row.id] };
  }
}

const idConflict = () =>
  new AppError('ID_CONFLICT', 'This ID is already used by a different record.');

export function createLoansService(ctx: AppContext) {
  const { prisma, clock } = ctx;
  const today = (user: User) => todayIn(user.timezone, clock.now());

  async function list(user: User, query: LoanListQuery): Promise<LoanListResponse> {
    const asOfDate = today(user);
    const where: Prisma.Sql[] = [];
    if (query.direction) where.push(Prisma.sql`AND l.direction = ${query.direction}::"Direction"`);
    if (query.personId) where.push(Prisma.sql`AND l.person_id = ${query.personId}::uuid`);
    if (query.search) {
      where.push(Prisma.sql`AND p.name_key LIKE ${nameSearchPattern(query.search)} ESCAPE '\\'`);
    }

    const having: Prisma.Sql[] = [];
    if (query.status === 'outstanding') having.push(Prisma.sql`AND outstanding_paise > 0`);
    if (query.status === 'overdue') having.push(Prisma.sql`AND bucket = ${BUCKET_OVERDUE}`);
    if (query.status === 'repaid') having.push(Prisma.sql`AND bucket = ${BUCKET_REPAID}`);
    if (query.cursor) having.push(keyset(decodeCursor(query.cursor, query.sort)));

    const rows = await queryLoans(prisma, {
      userId: user.id,
      today: asOfDate,
      where: where.length ? Prisma.join(where, ' ') : Prisma.empty,
      having: having.length ? Prisma.join(having, ' ') : Prisma.empty,
      orderBy: ORDER[query.sort],
      limit: query.limit + 1,
    });

    const page = rows.slice(0, query.limit);
    const last = page[page.length - 1];
    return {
      items: page.map((row) => toLoanDto(row, asOfDate)),
      nextCursor:
        rows.length > query.limit && last ? encodeCursor(cursorAfter(query.sort, last)) : null,
      asOfDate,
      timezone: user.timezone,
    };
  }

  async function detail(user: User, loanId: string): Promise<LoanDetailDto> {
    const asOfDate = today(user);
    const loan = await getLoanDto(prisma, user.id, loanId, asOfDate);
    if (!loan) throw notFound();
    const repayments = await prisma.repayment.findMany({
      where: { loanId, userId: user.id },
      orderBy: [{ paidOn: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });
    return { ...loan, repayments: repayments.map(toRepaymentDto) };
  }

  /** Person resolution inside the create transaction (architecture.md §6.4). */
  async function resolvePerson(tx: Db, userId: string, input: CreateLoanData): Promise<string> {
    if (input.personId) {
      const [person] = await tx.$queryRaw<{ id: string; archived_at: Date | null }[]>`
        SELECT id, archived_at FROM people
        WHERE id = ${input.personId}::uuid AND user_id = ${userId}::uuid
        FOR SHARE`;
      if (!person) throw notFound('Person not found.');
      if (person.archived_at !== null) {
        throw new AppError(
          'PERSON_ARCHIVED',
          'This person is archived. Unarchive them to add loans.',
        );
      }
      return person.id;
    }

    const name = input.personName!;
    const key = nameKey(name);
    if (!input.createNewPerson) {
      const matches = await tx.person.findMany({
        where: { userId, nameKey: key, archivedAt: null },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
      if (matches.length === 1) return matches[0]!.id;
      if (matches.length > 1) {
        throw new AppError(
          'PERSON_AMBIGUOUS',
          'More than one person has this name. Choose one.',
          {},
          { candidates: matches.map((p) => ({ id: p.id, name: p.name })) },
        );
      }
    }

    const person = await tx.person.create({
      data: { id: randomUUID(), userId, name, nameKey: key, createdAt: clock.now() },
    });
    return person.id;
  }

  /** "Same content" for a create retry (architecture.md §5.1). */
  function sameLoan(
    existing: {
      direction: string;
      principalPaise: bigint;
      loanDate: Date;
      dueDate: Date;
      note: string | null;
      personId: string;
      person: Person;
    },
    input: CreateLoanData,
  ): boolean {
    const samePerson = input.personId
      ? existing.personId === input.personId
      : existing.person.nameKey === nameKey(input.personName ?? '');
    return (
      samePerson &&
      existing.direction === input.direction &&
      existing.principalPaise === BigInt(input.amount) &&
      fromDbDate(existing.dueDate) === input.dueDate &&
      (input.loanDate === undefined || fromDbDate(existing.loanDate) === input.loanDate) &&
      existing.note === (input.note ?? null)
    );
  }

  async function create(
    user: User,
    input: CreateLoanData,
  ): Promise<{ status: 200 | 201; loan: LoanDto }> {
    for (let attempt = 0; ; attempt++) {
      try {
        const status = await prisma.$transaction(async (tx) => {
          const existing = await tx.loan.findUnique({
            where: { id: input.id },
            include: { person: true },
          });
          if (existing) {
            if (existing.userId !== user.id || !sameLoan(existing, input)) throw idConflict();
            return 200 as const;
          }

          const now = clock.now();
          const asOfDate = todayIn(user.timezone, now);
          const loanDate = input.loanDate ?? asOfDate;
          if (loanDate > asOfDate) throw validationError('loanDate', DATE_MESSAGES.future);

          const personId = await resolvePerson(tx, user.id, input);
          await tx.loan.create({
            data: {
              id: input.id,
              userId: user.id,
              personId,
              direction: input.direction,
              principalPaise: BigInt(input.amount),
              loanDate: toDbDate(loanDate),
              dueDate: toDbDate(input.dueDate),
              note: input.note ?? null,
              lastActivityAt: now,
              createdAt: now,
            },
          });
          return 201 as const;
        }, TX_OPTIONS);

        const loan = await getLoanDto(prisma, user.id, input.id, today(user));
        if (!loan) throw notFound();
        return { status, loan };
      } catch (error) {
        // A concurrent request with the same ID won the insert: re-run to replay its result.
        if (attempt === 0 && isUniqueViolation(error)) continue;
        throw error;
      }
    }
  }

  /** Records the exact outstanding amount once; a no-op when already settled. */
  async function settle(
    user: User,
    loanId: string,
    input: { paidOn?: string | undefined; note?: string | null | undefined },
  ): Promise<SettleResponse> {
    const repayment = await prisma.$transaction(async (tx) => {
      const now = clock.now();
      const asOfDate = todayIn(user.timezone, now);
      const locked = await lockLoan(tx, user.id, loanId);
      if (!locked) throw notFound();

      const paidOn = input.paidOn ?? asOfDate;
      if (paidOn > asOfDate) throw validationError('paidOn', DATE_MESSAGES.future);

      const outstanding = locked.principalPaise - locked.repaidPaise;
      if (outstanding === 0) return null;

      const created = await tx.repayment.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          loanId,
          amountPaise: BigInt(outstanding),
          paidOn: toDbDate(paidOn),
          note: input.note ?? null,
          createdAt: now,
        },
      });
      await tx.loan.update({
        where: { id: loanId },
        data: { version: { increment: 1 }, lastActivityAt: now },
      });
      return created;
    }, TX_OPTIONS);

    const loan = await getLoanDto(prisma, user.id, loanId, today(user));
    if (!loan) throw notFound();
    return { loan, repayment: repayment ? toRepaymentDto(repayment) : null };
  }

  return { list, detail, create, settle };
}

export type LoansService = ReturnType<typeof createLoansService>;
