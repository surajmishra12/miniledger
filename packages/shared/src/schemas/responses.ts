/**
 * Response DTO schemas (architecture.md §6.2). Used for contract tests and typed clients.
 */
import { z } from 'zod';

import { directionSchema, identifierTypeSchema, repaymentStatusSchema } from './fields';

const isoTimestamp = z.iso.datetime();
const isoDate = z.iso.date();
const paise = z.number().int().nonnegative();

export const userDtoSchema = z.strictObject({
  id: z.uuid(),
  identifierType: identifierTypeSchema,
  identifier: z.string(),
  displayName: z.string().nullable(),
  timezone: z.string(),
  createdAt: isoTimestamp,
});

export const personDtoSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  archived: z.boolean(),
  archivedAt: isoTimestamp.nullable(),
  owesYouPaise: paise,
  youOwePaise: paise,
  loanCount: z.number().int().nonnegative(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const loanDtoSchema = z.strictObject({
  id: z.uuid(),
  person: z.strictObject({ id: z.uuid(), name: z.string(), archived: z.boolean() }),
  direction: directionSchema,
  principalPaise: paise,
  repaidPaise: paise,
  outstandingPaise: paise,
  repaymentStatus: repaymentStatusSchema,
  isOverdue: z.boolean(),
  daysOverdue: z.number().int().nonnegative(),
  loanDate: isoDate,
  dueDate: isoDate,
  note: z.string().nullable(),
  version: z.number().int().positive(),
  lastActivityAt: isoTimestamp,
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
  asOfDate: isoDate,
});

export const repaymentDtoSchema = z.strictObject({
  id: z.uuid(),
  loanId: z.uuid(),
  amountPaise: paise,
  paidOn: isoDate,
  note: z.string().nullable(),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export const loanDetailDtoSchema = loanDtoSchema.extend({
  repayments: z.array(repaymentDtoSchema),
});

export const summaryDtoSchema = z.strictObject({
  totalLent: paise,
  totalRepaid: paise,
  overdueAmount: paise,
  outstandingLent: paise,
  totalBorrowed: paise,
  totalReturned: paise,
  outstandingBorrowed: paise,
  overdueBorrowed: paise,
  /** Context counts for the Home tiles (architecture.md §4.4). */
  peopleOwingYou: z.number().int().nonnegative(),
  peopleYouOwe: z.number().int().nonnegative(),
  lentLoans: z.number().int().nonnegative(),
  overdueLoans: z.number().int().nonnegative(),
  /** Outstanding, not overdue, due today … today + 6 (Home "Due this week"). */
  dueSoonLent: paise,
  dueSoonBorrowed: paise,
  dueSoonLoans: z.number().int().nonnegative(),
  currency: z.literal('INR'),
  unit: z.literal('paise'),
  asOfDate: isoDate,
  timezone: z.string(),
});

export const tokenPairDtoSchema = z.strictObject({
  accessToken: z.string(),
  accessTokenExpiresAt: isoTimestamp,
  refreshToken: z.string(),
  refreshTokenExpiresAt: isoTimestamp,
});

export const challengeDtoSchema = z.strictObject({
  challengeId: z.uuid(),
  expiresAt: isoTimestamp,
  resendAvailableAt: isoTimestamp,
  maskedDestination: z.string(),
});

export const authConfigDtoSchema = z.strictObject({
  authMode: z.enum(['assignment', 'production']),
  identifierType: identifierTypeSchema,
  otpLength: z.literal(6),
  otpTtlSeconds: z.number().int().positive(),
  resendCooldownSeconds: z.number().int().positive(),
});

export const verifyResponseSchema = z.strictObject({
  user: userDtoSchema,
  tokens: tokenPairDtoSchema,
  isNewUser: z.boolean(),
});

export const loanListResponseSchema = z.strictObject({
  items: z.array(loanDtoSchema),
  nextCursor: z.string().nullable(),
  asOfDate: isoDate,
  timezone: z.string(),
});

export const peopleListResponseSchema = z.strictObject({
  items: z.array(personDtoSchema),
});

export const loanMutationResponseSchema = z.strictObject({
  loan: loanDtoSchema,
  repayment: repaymentDtoSchema,
});

export const settleResponseSchema = z.strictObject({
  loan: loanDtoSchema,
  repayment: repaymentDtoSchema.nullable(),
});

export const healthResponseSchema = z.strictObject({
  status: z.literal('ok'),
  version: z.string(),
});

export type UserDto = z.infer<typeof userDtoSchema>;
export type PersonDto = z.infer<typeof personDtoSchema>;
export type LoanDto = z.infer<typeof loanDtoSchema>;
export type RepaymentDto = z.infer<typeof repaymentDtoSchema>;
export type LoanDetailDto = z.infer<typeof loanDetailDtoSchema>;
export type SummaryDto = z.infer<typeof summaryDtoSchema>;
export type TokenPairDto = z.infer<typeof tokenPairDtoSchema>;
export type ChallengeDto = z.infer<typeof challengeDtoSchema>;
export type AuthConfigDto = z.infer<typeof authConfigDtoSchema>;
export type VerifyResponse = z.infer<typeof verifyResponseSchema>;
export type LoanListResponse = z.infer<typeof loanListResponseSchema>;
export type PeopleListResponse = z.infer<typeof peopleListResponseSchema>;
export type LoanMutationResponse = z.infer<typeof loanMutationResponseSchema>;
export type SettleResponse = z.infer<typeof settleResponseSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
