import { z } from 'zod';

import { DATE_MESSAGES, isCalendarDate, isSupportedDate } from '../dates';
import { MONEY_MESSAGES, parseRupeesToPaise } from '../money';
import {
  codePointLength,
  DISPLAY_NAME_MAX,
  normalizeText,
  NOTE_MAX,
  PERSON_NAME_MAX,
} from '../text';

/** UUID (any version) — record IDs, challenge IDs. */
export const uuidSchema = z.uuid({ error: 'Invalid ID' });

/** Decimal rupee string → integer paise. */
export const amountSchema = z.string({ error: MONEY_MESSAGES.required }).transform((value, ctx) => {
  const result = parseRupeesToPaise(value);
  if (!result.ok) {
    ctx.addIssue({ code: 'custom', message: result.error });
    return z.NEVER;
  }
  return result.paise;
});

/** YYYY-MM-DD within 2000–2099. "Not after today" is checked by the server (it owns "today"). */
export const dateSchema = z
  .string({ error: DATE_MESSAGES.invalid })
  .refine(isCalendarDate, DATE_MESSAGES.invalid)
  .refine(isSupportedDate, DATE_MESSAGES.range);

function boundedText(max: number, label: string) {
  return z
    .string()
    .transform(normalizeText)
    .refine((v) => codePointLength(v) >= 1, `Enter a ${label}`)
    .refine((v) => codePointLength(v) <= max, `Use at most ${max} characters`);
}

/** Person name: normalized, 1–80 code points. */
export const personNameSchema = boundedText(PERSON_NAME_MAX, 'name');

/** Optional display name; empty → null. */
export const displayNameSchema = z
  .string()
  .transform(normalizeText)
  .refine(
    (v) => codePointLength(v) <= DISPLAY_NAME_MAX,
    `Use at most ${DISPLAY_NAME_MAX} characters`,
  )
  .transform((v) => (v === '' ? null : v))
  .nullable();

/** Optional note; trimmed, empty → null, ≤ 500 code points. Internal newlines are kept. */
export const noteSchema = z
  .string()
  .transform((v) => v.normalize('NFC').trim())
  .refine((v) => codePointLength(v) <= NOTE_MAX, `Use at most ${NOTE_MAX} characters`)
  .transform((v) => (v === '' ? null : v))
  .nullable();

export const directionSchema = z.enum(['LENT', 'BORROWED']);
export const repaymentStatusSchema = z.enum(['UNPAID', 'PARTIAL', 'REPAID']);
export const identifierTypeSchema = z.enum(['PHONE', 'EMAIL']);
export const otpCodeSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');
