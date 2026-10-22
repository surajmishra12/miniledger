/**
 * Prisma Client with the pg driver adapter (architecture.md §11.1).
 * Runtime queries use DATABASE_URL (pooled in production); migrations use DIRECT_URL.
 */
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client';

export function createPrisma(databaseUrl: string): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export type { PrismaClient };
