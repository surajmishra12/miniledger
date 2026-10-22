/**
 * Dependencies shared by every module. Built once in server.ts (or by tests).
 */
import type { Env } from './config/env';
import type { PrismaClient } from './generated/prisma/client';
import type { Clock } from './lib/clock';
import type { Logger } from './lib/logger';
import type { OtpDelivery } from './lib/otp-delivery';

export type AppContext = {
  env: Env;
  prisma: PrismaClient;
  clock: Clock;
  logger: Logger;
  delivery: OtpDelivery;
  version: string;
};

/** Interactive transaction limits (architecture.md §10.1). */
export const TX_OPTIONS = { maxWait: 5_000, timeout: 10_000 } as const;
