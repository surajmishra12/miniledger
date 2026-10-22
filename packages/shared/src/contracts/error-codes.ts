/**
 * Stable API error codes and their HTTP statuses (architecture.md §6.6).
 * The app maps codes (never messages) to user-facing copy (design.md §9.4).
 */
export const ERROR_STATUS = {
  MALFORMED_JSON: 400,
  OTP_INVALID: 400,
  OTP_EXPIRED: 400,
  OTP_ATTEMPTS_EXCEEDED: 400,
  UNAUTHENTICATED: 401,
  REFRESH_TOKEN_INVALID: 401,
  NOT_FOUND: 404,
  ID_CONFLICT: 409,
  PERSON_AMBIGUOUS: 409,
  PERSON_ARCHIVED: 409,
  PERSON_HAS_LOANS: 409,
  AMOUNT_EXCEEDS_OUTSTANDING: 409,
  PRINCIPAL_BELOW_REPAID: 409,
  DIRECTION_LOCKED: 409,
  RECORD_CHANGED: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  VALIDATION_FAILED: 422,
  INVALID_CURSOR: 422,
  OTP_RESEND_COOLDOWN: 429,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  OTP_DELIVERY_FAILED: 503,
  OTP_DAILY_LIMIT_REACHED: 503,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export const ERROR_CODES = Object.keys(ERROR_STATUS) as ErrorCode[];

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    fieldErrors: Record<string, string>;
    details: Record<string, unknown>;
    requestId: string;
  };
};
