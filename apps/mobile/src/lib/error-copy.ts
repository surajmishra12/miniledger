/**
 * Maps API error codes to user-facing copy (design.md §9.4). Never shows server messages or codes.
 */
import { formatPaise } from '@miniledger/shared';

import { ApiError, NetworkError } from './api-client';

export const CONNECTION_COPY = "Couldn't connect. Check your connection and try again.";
export const OFFLINE_SAVE_COPY = "You're offline. Connect to save this change.";
const GENERIC_COPY = "Something didn't work. Please try again.";

const minutes = (seconds: number | null) => Math.max(1, Math.ceil((seconds ?? 60) / 60));

export function errorCopy(error: unknown): string {
  if (error instanceof NetworkError) return CONNECTION_COPY;
  if (!(error instanceof ApiError)) return GENERIC_COPY;

  const details = error.details;
  switch (error.code) {
    case 'OTP_INVALID':
      return typeof details.attemptsRemaining === 'number'
        ? `That code isn't right. ${details.attemptsRemaining} ${details.attemptsRemaining === 1 ? 'attempt' : 'attempts'} left.`
        : 'This code is no longer valid. Request a new one.';
    case 'OTP_EXPIRED':
      return 'This code has expired. Request a new one.';
    case 'OTP_ATTEMPTS_EXCEEDED':
      return 'Too many incorrect attempts. Request a new code.';
    case 'OTP_RESEND_COOLDOWN':
      return `Please wait ${error.retryAfterSeconds ?? 60} seconds before requesting another code.`;
    case 'RATE_LIMITED':
      return `Too many attempts. Try again in ${minutes(error.retryAfterSeconds)} minutes.`;
    case 'OTP_DELIVERY_FAILED':
      return "We couldn't send the code. Please try again.";
    case 'OTP_DAILY_LIMIT_REACHED':
      return 'Sign-in is temporarily unavailable. Please try again tomorrow.';
    case 'REFRESH_TOKEN_INVALID':
    case 'UNAUTHENTICATED':
      return 'Your session ended. Please sign in again.';
    case 'AMOUNT_EXCEEDS_OUTSTANDING':
      return typeof details.maxAmountPaise === 'number'
        ? `Maximum is ${formatPaise(details.maxAmountPaise)}.`
        : 'The amount is more than the remaining balance.';
    case 'PRINCIPAL_BELOW_REPAID':
      return typeof details.minAmountPaise === 'number'
        ? `Amount can't be less than ${formatPaise(details.minAmountPaise)} already repaid.`
        : "Amount can't be less than what has already been repaid.";
    case 'DIRECTION_LOCKED':
      return "Direction can't change after repayments are recorded.";
    case 'RECORD_CHANGED':
      return 'This loan was changed on another device.';
    case 'PERSON_ARCHIVED':
      return 'This person is archived. Unarchive them to add loans.';
    case 'PERSON_HAS_LOANS':
      return 'This person has loans. Archive them instead.';
    case 'NOT_FOUND':
      return 'This item no longer exists.';
    case 'ID_CONFLICT':
      return 'This was already saved.';
    case 'SERVICE_UNAVAILABLE':
    case 'INTERNAL_ERROR':
      return CONNECTION_COPY;
    default:
      return GENERIC_COPY;
  }
}

/** True when the request may not have reached the server (safe to retry with the same ID). */
export const isConnectionProblem = (error: unknown) =>
  error instanceof NetworkError ||
  (error instanceof ApiError && (error.status >= 500 || error.code === 'SERVICE_UNAVAILABLE'));
