// Prisma CLI configuration (architecture.md §11.1).
// The CLI (migrate, studio) uses DIRECT_URL; the running API uses DATABASE_URL via the driver adapter.
// `prisma generate` needs no database, so a missing DIRECT_URL is only an error for DB commands.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? '',
  },
});
