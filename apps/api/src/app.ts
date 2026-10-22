/**
 * Express application (architecture.md §10.1 middleware order):
 * request-id → pino-http → helmet → JSON body → routes → 404 → error handler.
 */
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import type { AppContext } from './context';
import { createErrorHandler, notFoundHandler } from './middleware/error-handler';
import { jsonBodyParser, requireJsonContentType } from './middleware/json-body';
import { requestId } from './middleware/request-id';
import { createRoutes } from './routes';

export function createApp(ctx: AppContext): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', ctx.env.TRUST_PROXY_HOPS);

  app.use(requestId);
  app.use(
    pinoHttp({
      logger: ctx.logger,
      genReqId: (req) => (req as express.Request).id,
      // Route and status only; bodies and headers never reach the logs.
      serializers: {
        req: (req: { id: string; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url.split('?')[0],
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(helmet());
  app.use(requireJsonContentType);
  app.use(jsonBodyParser);

  app.use(createRoutes(ctx));

  app.use(notFoundHandler);
  app.use(createErrorHandler(ctx.logger));

  return app;
}
