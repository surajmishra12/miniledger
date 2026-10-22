/**
 * Application errors rendered as the standard error envelope (architecture.md §6.6).
 */
import { ERROR_STATUS, type ErrorCode } from '@miniledger/shared';

import { Prisma } from '../generated/prisma/client';

export class AppError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fieldErrors: Record<string, string> = {},
    readonly details: Record<string, unknown> = {},
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.status = ERROR_STATUS[code];
  }
}

export const notFound = (message = 'Not found.') => new AppError('NOT_FOUND', message);

export const validationError = (field: string, message: string) =>
  new AppError('VALIDATION_FAILED', 'Some fields are invalid.', { [field]: message });

/** True for a unique-constraint violation raised by a Prisma model query. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** True for a foreign-key violation (SQLSTATE 23503), e.g. deleting a person who still has loans. */
export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003';
}
