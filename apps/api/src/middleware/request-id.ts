import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare module 'express-serve-static-core' {
  interface Request {
    id: string;
  }
}

/** Uses the client's X-Request-Id when it is a UUID, otherwise generates one; echoes it back. */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get('x-request-id');
  req.id = incoming && UUID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};
