/**
 * People: list with separate balances, create with a client-generated ID (architecture.md §5.1, §6.3).
 */
import { nameKey, type PeopleListQuery, type PersonDto } from '@miniledger/shared';

import type { AppContext } from '../../context';
import { Prisma, type PrismaClient } from '../../generated/prisma/client';
import { AppError, isUniqueViolation } from '../../lib/errors';
import { toSafeInteger } from '../../lib/numbers';

type Db = PrismaClient | Prisma.TransactionClient;

type PersonRow = {
  id: string;
  name: string;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
  owes_you: unknown;
  you_owe: unknown;
  loan_count: unknown;
};

/** LIKE pattern for a case-insensitive substring match on name_key (architecture.md §6.5). */
export function nameSearchPattern(search: string): string {
  return `%${nameKey(search).replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function toPersonDto(row: PersonRow): PersonDto {
  return {
    id: row.id,
    name: row.name,
    archived: row.archived_at !== null,
    archivedAt: row.archived_at?.toISOString() ?? null,
    owesYouPaise: toSafeInteger(row.owes_you),
    youOwePaise: toSafeInteger(row.you_owe),
    loanCount: toSafeInteger(row.loan_count),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function queryPeople(db: Db, userId: string, filter: Prisma.Sql): Promise<PersonDto[]> {
  const rows = await db.$queryRaw<PersonRow[]>`
    SELECT p.id, p.name, p.archived_at, p.created_at, p.updated_at,
      COALESCE(SUM(l.principal_paise - COALESCE(r.repaid, 0)) FILTER (WHERE l.direction = 'LENT'), 0) AS owes_you,
      COALESCE(SUM(l.principal_paise - COALESCE(r.repaid, 0)) FILTER (WHERE l.direction = 'BORROWED'), 0) AS you_owe,
      COUNT(l.id) AS loan_count
    FROM people p
    LEFT JOIN loans l ON l.person_id = p.id AND l.user_id = p.user_id
    LEFT JOIN (
      SELECT loan_id, SUM(amount_paise) AS repaid
      FROM repayments WHERE user_id = ${userId}::uuid GROUP BY loan_id
    ) r ON r.loan_id = l.id
    WHERE p.user_id = ${userId}::uuid ${filter}
    GROUP BY p.id
    ORDER BY p.name_key, p.id`;
  return rows.map(toPersonDto);
}

export function createPeopleService(ctx: AppContext) {
  const { prisma, clock } = ctx;

  async function list(userId: string, query: PeopleListQuery): Promise<PersonDto[]> {
    const archived = query.archived
      ? Prisma.sql`AND p.archived_at IS NOT NULL`
      : Prisma.sql`AND p.archived_at IS NULL`;
    const search = query.search
      ? Prisma.sql`AND p.name_key LIKE ${nameSearchPattern(query.search)} ESCAPE '\\'`
      : Prisma.empty;
    return queryPeople(prisma, userId, Prisma.sql`${archived} ${search}`);
  }

  async function get(db: Db, userId: string, personId: string): Promise<PersonDto | null> {
    const [person] = await queryPeople(db, userId, Prisma.sql`AND p.id = ${personId}::uuid`);
    return person ?? null;
  }

  /** Create with a client ID: a retry returns the existing person (200) instead of a duplicate. */
  async function create(
    userId: string,
    input: { id: string; name: string },
  ): Promise<{ status: 200 | 201; person: PersonDto }> {
    const replay = async () => {
      const existing = await prisma.person.findUnique({ where: { id: input.id } });
      if (!existing) return null;
      if (existing.userId !== userId || existing.name !== input.name) {
        throw new AppError('ID_CONFLICT', 'This ID is already used by a different record.');
      }
      return { status: 200 as const, person: (await get(prisma, userId, input.id))! };
    };

    const existing = await replay();
    if (existing) return existing;

    try {
      const now = clock.now();
      await prisma.person.create({
        data: {
          id: input.id,
          userId,
          name: input.name,
          nameKey: nameKey(input.name),
          createdAt: now,
        },
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await replay();
      if (raced) return raced;
      throw error;
    }
    return { status: 201, person: (await get(prisma, userId, input.id))! };
  }

  return { list, get, create };
}

export type PeopleService = ReturnType<typeof createPeopleService>;
