/**
 * Converts every error into the standard envelope (architecture.md §6.6).
 * Never leaks stack traces, SQL or secrets to clients.
 */
import type { ApiErrorBody, ErrorCode } from '@miniledger/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../lib/errors';
import type { Logger } from '../lib/logger';

function envelope(
  code: ErrorCode,
  message: string,
  requestId: string,
  fieldErrors: Record<string, string> = {},
  details: Record<string, unknown> = {},
): ApiErrorBody {
  return { error: { code, message, fieldErrors, details, requestId } };
}

/** First message per field path, e.g. { amount: "Enter an amount greater than ₹0" }. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    if (fieldErrors[key] === undefined) {
      fieldErrors[key] =
        issue.code === 'unrecognized_keys'
          ? `Unknown field(s): ${issue.keys.join(', ')}`
          : issue.message;
    }
  }
  return fieldErrors;
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND', 'Not found.'));
};

type BodyParserError = Error & { type?: string; status?: number };

export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, req, res, _next) => {
    const requestId = req.id;
    let status: number;
    let body: ApiErrorBody;

    if (err instanceof AppError) {
      status = err.status;
      body = envelope(err.code, err.message, requestId, err.fieldErrors, err.details);
      for (const [name, value] of Object.entries(err.headers)) res.setHeader(name, value);
    } else if (err instanceof ZodError) {
      status = 422;
      body = envelope(
        'VALIDATION_FAILED',
        'Some fields are invalid.',
        requestId,
        zodFieldErrors(err),
      );
    } else if ((err as BodyParserError)?.type === 'entity.parse.failed') {
      status = 400;
      body = envelope('MALFORMED_JSON', 'Request body is not valid JSON.', requestId);
    } else if ((err as BodyParserError)?.type === 'entity.too.large') {
      status = 413;
      body = envelope('PAYLOAD_TOO_LARGE', 'Request body is too large.', requestId);
    } else {
      status = 500;
      body = envelope('INTERNAL_ERROR', 'Something went wrong.', requestId);
      logger.error({ err, requestId }, 'unhandled error');
    }

    res.status(status).json(body);
  };
}
