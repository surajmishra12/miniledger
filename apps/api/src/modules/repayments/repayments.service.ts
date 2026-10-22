/**
 * Repayments: create (client ID), edit and delete — always under the per-loan lock so the
 * sum of repayments can never exceed the principal (architecture.md §5.2).
 */
import { DATE_MESSAGES, formatPaise, type LoanMutationResponse } from '@miniledger/shared';

import type { AppContext } from '../../context';
import { TX_OPTIONS } from '../../context';
import type { User } from '../../generated/prisma/client';
import { fromDbDate, todayIn, toDbDate } from '../../lib/dates';
import { AppError, isUniqueViolation, notFound, validationError } from '../../lib/errors';
import { toSafeInteger } from '../../lib/numbers';
import { getLoanDto, lockLoan, toRepaymentDto } from '../loans/loan.queries';

const exceedsOutstanding = (maxAmountPaise: number) =>
  new AppError(
    'AMOUNT_EXCEEDS_OUTSTANDING',
    'The repayment is more than the remaining balance.',
    { amount: `Maximum is ${formatPaise(maxAmountPaise)}` },
    { maxAmountPaise },
  );

type CreateInput = {
  id: string;
  amount: number;
  paidOn?: string | undefined;
  note?: string | null | undefined;
};
type PatchInput = {
  amount?: number | undefined;
  paidOn?: string | undefined;
  note?: string | null | undefined;
};

export function createRepaymentsService(ctx: AppContext) {
  const { prisma, clock } = ctx;

  async function respond(
    user: User,
    loanId: string,
    repaymentId: string,
  ): Promise<LoanMutationResponse> {
    const today = todayIn(user.timezone, clock.now());
    const [loan, repayment] = await Promise.all([
      getLoanDto(prisma, user.id, loanId, today),
      prisma.repayment.findUnique({ where: { id: repaymentId } }),
    ]);
    if (!loan || !repayment) throw notFound();
    return { loan, repayment: toRepaymentDto(repayment) };
  }

  async function create(
    user: User,
    loanId: string,
    input: CreateInput,
  ): Promise<{ status: 200 | 201; body: LoanMutationResponse }> {
    for (let attempt = 0; ; attempt++) {
      try {
        const status = await prisma.$transaction(async (tx) => {
          const existing = await tx.repayment.findUnique({ where: { id: input.id } });
          if (existing) {
            const same =
              existing.userId === user.id &&
              existing.loanId === loanId &&
              toSafeInteger(existing.amountPaise) === input.amount &&
              (input.paidOn === undefined || fromDbDate(existing.paidOn) === input.paidOn) &&
              existing.note === (input.note ?? null);
            if (!same) {
              throw new AppError('ID_CONFLICT', 'This ID is already used by a different record.');
            }
            return 200 as const;
          }

          const now = clock.now();
          const today = todayIn(user.timezone, now);
          const locked = await lockLoan(tx, user.id, loanId);
          if (!locked) throw notFound();

          const paidOn = input.paidOn ?? today;
          if (paidOn > today) throw validationError('paidOn', DATE_MESSAGES.future);
          const outstanding = locked.principalPaise - locked.repaidPaise;
          if (input.amount > outstanding) throw exceedsOutstanding(outstanding);

          await tx.repayment.create({
            data: {
              id: input.id,
              userId: user.id,
              loanId,
              amountPaise: BigInt(input.amount),
              paidOn: toDbDate(paidOn),
              note: input.note ?? null,
              createdAt: now,
            },
          });
          await tx.loan.update({
            where: { id: loanId },
            data: { version: { increment: 1 }, lastActivityAt: now },
          });
          return 201 as const;
        }, TX_OPTIONS);
        return { status, body: await respond(user, loanId, input.id) };
      } catch (error) {
        if (attempt === 0 && isUniqueViolation(error)) continue;
        throw error;
      }
    }
  }

  async function update(
    user: User,
    loanId: string,
    repaymentId: string,
    input: PatchInput,
  ): Promise<LoanMutationResponse> {
    await prisma.$transaction(async (tx) => {
      const now = clock.now();
      const today = todayIn(user.timezone, now);
      const locked = await lockLoan(tx, user.id, loanId);
      if (!locked) throw notFound();
      const repayment = await tx.repayment.findFirst({
        where: { id: repaymentId, loanId, userId: user.id },
      });
      if (!repayment) throw notFound();

      if (input.amount !== undefined) {
        const available =
          locked.principalPaise - (locked.repaidPaise - toSafeInteger(repayment.amountPaise));
        if (input.amount > available) throw exceedsOutstanding(available);
      }
      if (input.paidOn !== undefined && input.paidOn > today) {
        throw validationError('paidOn', DATE_MESSAGES.future);
      }

      await tx.repayment.update({
        where: { id: repaymentId },
        data: {
          ...(input.amount !== undefined ? { amountPaise: BigInt(input.amount) } : {}),
          ...(input.paidOn !== undefined ? { paidOn: toDbDate(input.paidOn) } : {}),
          ...(input.note !== undefined ? { note: input.note } : {}),
        },
      });
      await tx.loan.update({
        where: { id: loanId },
        data: { version: { increment: 1 }, lastActivityAt: now },
      });
    }, TX_OPTIONS);
    return respond(user, loanId, repaymentId);
  }

  async function remove(user: User, loanId: string, repaymentId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const now = clock.now();
      const locked = await lockLoan(tx, user.id, loanId);
      if (!locked) throw notFound();
      const deleted = await tx.repayment.deleteMany({
        where: { id: repaymentId, loanId, userId: user.id },
      });
      if (deleted.count === 0) throw notFound();
      await tx.loan.update({
        where: { id: loanId },
        data: { version: { increment: 1 }, lastActivityAt: now },
      });
    }, TX_OPTIONS);
  }

  return { create, update, remove };
}

export type RepaymentsService = ReturnType<typeof createRepaymentsService>;
