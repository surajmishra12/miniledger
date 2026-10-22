/**
 * Process entry point: validate config, start HTTP, shut down gracefully.
 */
import { readFileSync } from 'node:fs';

import { createApp } from './app';
import { ConfigError, loadEnv, type Env } from './config/env';
import { systemClock } from './lib/clock';
import { createLogger } from './lib/logger';
import { createLogDelivery, unavailableDelivery } from './lib/otp-delivery';
import { createPrisma } from './lib/prisma';

function readVersion(): string {
  // src/server.ts (dev) and dist/server.js (prod) both sit one level below package.json.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  };
  return pkg.version;
}

function loadEnvOrExit(): Env {
  try {
    return loadEnv();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

function main(): void {
  const env = loadEnvOrExit();
  const logger = createLogger(env.LOG_LEVEL, { pretty: env.NODE_ENV === 'development' });
  const prisma = createPrisma(env.DATABASE_URL);
  const version = readVersion();
  // Assignment mode prints OTPs to this log; production email delivery arrives in Phase 4.
  const delivery = env.AUTH_MODE === 'assignment' ? createLogDelivery(logger) : unavailableDelivery;
  const app = createApp({ env, prisma, clock: systemClock, logger, delivery, version });

  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info({ port: env.PORT, authMode: env.AUTH_MODE, version }, 'MiniLedger API listening');
  });
  server.requestTimeout = 30_000;

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
