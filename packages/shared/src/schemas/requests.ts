/**
 * Request schemas (architecture.md §6.3–6.5). Bodies are strict: unknown fields are rejected.
 */
import { z } from 'zod';

import {
  amountSchema,
  dateSchema,
  directionSchema,
  displayNameSchema,
  noteSchema,
  otpCodeSchema,
  personNameSchema,
  uuidSchema,
} from './fields';

const atLeastOne = (keys: readonly string[]) => (value: Record<string, unknown>) =>
  keys.some((key) => value[key] !== undefined);

// ---- Auth ----

export const otpRequestSchema = z.strictObject({
  identifier: z.string().max(320),
});

export const otpVerifySchema = z.strictObject({
  challengeId: uuidSchema,
  code: otpCodeSchema,
  timezone: z.string().max(64).optional(),
});

export const refreshSchema = z.strictObject({
  refreshToken: z.string().min(1).max(200),
});

export const reauthRequestSchema = z.strictObject({});

export const deleteMeSchema = z.strictObject({
  challengeId: uuidSchema,
  code: otpCodeSchema,
});

export const patchMeSchema = z
  .strictObject({
    displayName: displayNameSchema.optional(),
    timezone: z.string().min(1).max(64).optional(),
  })
  .refine(atLeastOne(['displayName', 'timezone']), 'Provide at least one field');

// ---- People ----

export const createPersonSchema = z.strictObject({
  id: uuidSchema,
  name: personNameSchema,
});

export const patchPersonSchema = z
  .strictObject({
    name: personNameSchema.optional(),
    archived: z.boolean().optional(),
  })
  .refine(atLeastOne(['name', 'archived']), 'Provide at least one field');

export const peopleListQuerySchema = z.object({
  search: z.string().min(1).max(80).optional(),
  archived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

// ---- Loans ----

export const createLoanSchema = z
  .strictObject({
    id: uuidSchema,
    personId: uuidSchema.optional(),
    personName: personNameSchema.optional(),
    createNewPerson: z.boolean().optional(),
    direction: directionSchema.default('LENT'),
    amount: amountSchema,
    loanDate: dateSchema.optional(),
    dueDate: dateSchema,
    note: noteSchema.optional(),
  })
  .superRefine((value, ctx) => {
    const hasId = value.personId !== undefined;
    const hasName = value.personName !== undefined;
    if (hasId === hasName) {
      ctx.addIssue({
        code: 'custom',
        path: ['personName'],
        message: 'Choose a person or enter a name',
      });
    }
    if (value.createNewPerson && !hasName) {
      ctx.addIssue({
        code: 'custom',
        path: ['createNewPerson'],
        message: 'createNewPerson requires personName',
      });
    }
  });

export const patchLoanSchema = z
  .strictObject({
    version: z.number().int().min(1),
    personId: uuidSchema.optional(),
    direction: directionSchema.optional(),
    amount: amountSchema.optional(),
    loanDate: dateSchema.optional(),
    dueDate: dateSchema.optional(),
    note: noteSchema.optional(),
  })
  .refine(
    atLeastOne(['personId', 'direction', 'amount', 'loanDate', 'dueDate', 'note']),
    'Provide at least one field to change',
  );

export const settleLoanSchema = z.strictObject({
  paidOn: dateSchema.optional(),
  note: noteSchema.optional(),
});

export const loanSortSchema = z.enum(['attention', 'dueDate', 'recent']);

export const loanListQuerySchema = z.object({
  direction: directionSchema.optional(),
  status: z.enum(['outstanding', 'overdue', 'repaid']).optional(),
  search: z.string().min(1).max(80).optional(),
  personId: uuidSchema.optional(),
  sort: loanSortSchema.default('attention'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(500).optional(),
});

// ---- Repayments ----

export const createRepaymentSchema = z.strictObject({
  id: uuidSchema,
  amount: amountSchema,
  paidOn: dateSchema.optional(),
  note: noteSchema.optional(),
});

export const patchRepaymentSchema = z
  .strictObject({
    amount: amountSchema.optional(),
    paidOn: dateSchema.optional(),
    note: noteSchema.optional(),
  })
  .refine(atLeastOne(['amount', 'paidOn', 'note']), 'Provide at least one field to change');

export type OtpRequestInput = z.input<typeof otpRequestSchema>;
export type OtpVerifyInput = z.input<typeof otpVerifySchema>;
export type PatchMeInput = z.input<typeof patchMeSchema>;
export type CreatePersonInput = z.input<typeof createPersonSchema>;
export type PatchPersonInput = z.input<typeof patchPersonSchema>;
export type CreateLoanInput = z.input<typeof createLoanSchema>;
export type CreateLoanData = z.output<typeof createLoanSchema>;
export type PatchLoanInput = z.input<typeof patchLoanSchema>;
export type SettleLoanInput = z.input<typeof settleLoanSchema>;
export type LoanSort = z.output<typeof loanSortSchema>;
export type LoanListQuery = z.output<typeof loanListQuerySchema>;
export type PeopleListQuery = z.output<typeof peopleListQuerySchema>;
export type CreateRepaymentInput = z.input<typeof createRepaymentSchema>;
export type PatchRepaymentInput = z.input<typeof patchRepaymentSchema>;
