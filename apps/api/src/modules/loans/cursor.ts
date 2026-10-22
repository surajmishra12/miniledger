/**
 * Opaque keyset cursors for the loan list: base64url JSON { v, sort, after } (architecture.md §6.1).
 */
import type { LoanSort } from '@miniledger/shared';
import { z } from 'zod';

import { AppError } from '../../lib/errors';

const uuid = z.uuid();
const isoDate = z.iso.date();

const cursorSchema = z.discriminatedUnion('sort', [
  z.object({
    v: z.literal(1),
    sort: z.literal('attention'),
    after: z.tuple([z.number().int().min(0).max(2), isoDate, uuid]),
  }),
  z.object({ v: z.literal(1), sort: z.literal('dueDate'), after: z.tuple([isoDate, uuid]) }),
  z.object({
    v: z.literal(1),
    sort: z.literal('recent'),
    after: z.tuple([z.iso.datetime(), uuid]),
  }),
]);

export type LoanCursor = z.infer<typeof cursorSchema>;

export function encodeCursor(cursor: LoanCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

const invalidCursor = () =>
  new AppError('INVALID_CURSOR', 'This list position is no longer valid. Reload the list.');

export function decodeCursor(value: string, sort: LoanSort): LoanCursor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    throw invalidCursor();
  }
  const result = cursorSchema.safeParse(parsed);
  if (!result.success || result.data.sort !== sort) throw invalidCursor();
  return result.data;
}
