/**
 * JSON-only request bodies, 16 KB max (architecture.md §6).
 */
import express, { type RequestHandler } from 'express';

import { AppError } from '../lib/errors';

export const BODY_LIMIT = '16kb';

function hasBody(req: Parameters<RequestHandler>[0]): boolean {
  const length = req.get('content-length');
  return (length !== undefined && length !== '0') || req.get('transfer-encoding') !== undefined;
}

/** Rejects bodies that are not application/json with 415. */
export const requireJsonContentType: RequestHandler = (req, _res, next) => {
  if (hasBody(req) && !req.is('application/json')) {
    next(new AppError('UNSUPPORTED_MEDIA_TYPE', 'Request body must be application/json.'));
    return;
  }
  next();
};

export const jsonBodyParser = express.json({ limit: BODY_LIMIT, strict: true });
