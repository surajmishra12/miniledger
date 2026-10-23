import {
  loanDetailDtoSchema,
  loanDtoSchema,
  loanListResponseSchema,
  settleResponseSchema,
  summaryDtoSchema,
} from '@miniledger/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { toDbDate } from '../../src/lib/dates';
import {
  createTestApp,
  expectError,
  prisma,
  resetDatabase,
  signIn,
  uuid,
  type SignedIn,
  type TestApp,
} from '../helpers';

// FakeClock starts at 2026-10-22 12:00 IST → "today" is 2026-10-22.
const TODAY = '2026-10-22';
const YESTERDAY = '2026-10-21';
const NEXT_WEEK = '2026-10-29';

let t: TestApp;
let user: SignedIn;

beforeEach(async () => {
  await resetDatabase();
  t = createTestApp();
  user = await signIn(t);
});

const createLoan = (auth: SignedIn, body: Record<string, unknown>) =>
  request(t.app).post('/v1/loans').set(auth.auth).send(body);

async function newLoan(body: Record<string, unknown>, auth = user) {
  const res = await createLoan(auth, { id: uuid(), dueDate: NEXT_WEEK, ...body });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return loanDtoSchema.parse(res.body);
}

/** Simulates a partial repayment (repayment endpoints arrive in Phase 3). */
async function addRepayment(loanId: string, amountPaise: number, userId = user.userId) {
  await prisma.repayment.create({
    data: {
      id: uuid(),
      userId,
      loanId,
      amountPaise: BigInt(amountPaise),
      paidOn: toDbDate(TODAY),
    },
  });
}

const settle = (loanId: string, auth = user, body: Record<string, unknown> = {}) =>
  request(t.app).post(`/v1/loans/${loanId}/settle`).set(auth.auth).send(body);
const summary = async (auth = user) =>
  summaryDtoSchema.parse((await request(t.app).get('/v1/summary').set(auth.auth)).body);

describe('POST /v1/loans', () => {
  it('accepts the minimal assignment request', async () => {
    const id = uuid();
    const res = await createLoan(user, {
      id,
      personName: 'Rahul',
      amount: '5000.00',
      dueDate: '2026-10-30',
    });
    expect(res.status).toBe(201);
    expect(loanDtoSchema.parse(res.body)).toMatchObject({
      id,
      person: { name: 'Rahul', archived: false },
      direction: 'LENT',
      principalPaise: 500000,
      repaidPaise: 0,
      outstandingPaise: 500000,
      repaymentStatus: 'UNPAID',
      isOverdue: false,
      daysOverdue: 0,
      loanDate: TODAY,
      dueDate: '2026-10-30',
      note: null,
      version: 1,
      asOfDate: TODAY,
    });
  });

  it('reuses a single matching person, creates on request, and reports ambiguity', async () => {
    const first = await newLoan({ personName: 'Rahul', amount: '100' });
    const second = await newLoan({ personName: '  rahul ', amount: '200' });
    expect(second.person.id).toBe(first.person.id);

    const separate = await newLoan({ personName: 'Rahul', amount: '300', createNewPerson: true });
    expect(separate.person.id).not.toBe(first.person.id);

    const ambiguous = await createLoan(user, {
      id: uuid(),
      personName: 'Rahul',
      amount: '1',
      dueDate: NEXT_WEEK,
    });
    expectError(ambiguous, 409, 'PERSON_AMBIGUOUS');
    expect(ambiguous.body.error.details.candidates).toHaveLength(2);
  });

  it('uses an explicit personId and enforces ownership and archive state', async () => {
    const loan = await newLoan({ personName: 'Priya', amount: '100' });
    expect((await newLoan({ personId: loan.person.id, amount: '50' })).person.id).toBe(
      loan.person.id,
    );

    const other = await signIn(t);
    expectError(
      await createLoan(other, {
        id: uuid(),
        personId: loan.person.id,
        amount: '1',
        dueDate: TODAY,
      }),
      404,
      'NOT_FOUND',
    );

    await prisma.person.update({ where: { id: loan.person.id }, data: { archivedAt: new Date() } });
    expectError(
      await createLoan(user, { id: uuid(), personId: loan.person.id, amount: '1', dueDate: TODAY }),
      409,
      'PERSON_ARCHIVED',
    );
  });

  it('validates amount, dates and unknown fields', async () => {
    const base = { id: uuid(), personName: 'A', amount: '10', dueDate: TODAY };
    const zero = await createLoan(user, { ...base, amount: '0' });
    expectError(zero, 422, 'VALIDATION_FAILED');
    expect(zero.body.error.fieldErrors.amount).toBe('Enter an amount greater than ₹0');
    expectError(await createLoan(user, { ...base, amount: 10 }), 422, 'VALIDATION_FAILED');
    expectError(
      await createLoan(user, { ...base, dueDate: '2026-02-30' }),
      422,
      'VALIDATION_FAILED',
    );
    const future = await createLoan(user, { ...base, loanDate: '2026-10-23' });
    expectError(future, 422, 'VALIDATION_FAILED');
    expect(future.body.error.fieldErrors.loanDate).toBeDefined();
    expectError(await createLoan(user, { ...base, userId: uuid() }), 422, 'VALIDATION_FAILED');
    expect(await prisma.loan.count()).toBe(0);
  });

  it('allows past due dates (historical, already overdue loans)', async () => {
    const loan = await newLoan({
      personName: 'Old',
      amount: '10',
      loanDate: '2026-09-01',
      dueDate: '2026-10-01',
    });
    expect(loan).toMatchObject({ isOverdue: true, daysOverdue: 21 });
  });

  it('replays a retry with the same ID and rejects different content', async () => {
    const body = { id: uuid(), personName: 'Rahul', amount: '5000', dueDate: NEXT_WEEK };
    expect((await createLoan(user, body)).status).toBe(201);
    const retry = await createLoan(user, body);
    expect(retry.status).toBe(200);
    expect(retry.body.id).toBe(body.id);
    expectError(await createLoan(user, { ...body, amount: '5001' }), 409, 'ID_CONFLICT');
    expect(await prisma.loan.count()).toBe(1);
    expect(await prisma.person.count()).toBe(1);
  });

  it('inserts exactly once under concurrent retries with the same ID', async () => {
    const body = { id: uuid(), personName: 'Concurrent', amount: '700', dueDate: NEXT_WEEK };
    const results = await Promise.all(Array.from({ length: 5 }, () => createLoan(user, body)));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 200, 200, 200, 201]);
    expect(await prisma.loan.count()).toBe(1);
    expect(await prisma.person.count()).toBe(1);
  });
});

describe('GET /v1/loans/:id', () => {
  it('returns the loan with its repayment history, newest first', async () => {
    const loan = await newLoan({ personName: 'Rahul', amount: '5000' });
    await addRepayment(loan.id, 100000);
    t.clock.advance(1000);
    await addRepayment(loan.id, 50000);
    const res = await request(t.app).get(`/v1/loans/${loan.id}`).set(user.auth);
    const detail = loanDetailDtoSchema.parse(res.body);
    expect(detail).toMatchObject({
      repaidPaise: 150000,
      outstandingPaise: 350000,
      repaymentStatus: 'PARTIAL',
    });
    expect(detail.repayments).toHaveLength(2);
  });

  it('returns 404 for malformed, unknown or foreign IDs', async () => {
    const loan = await newLoan({ personName: 'Rahul', amount: '10' });
    const other = await signIn(t);
    expectError(await request(t.app).get('/v1/loans/abc').set(user.auth), 404, 'NOT_FOUND');
    expectError(await request(t.app).get(`/v1/loans/${uuid()}`).set(user.auth), 404, 'NOT_FOUND');
    expectError(await request(t.app).get(`/v1/loans/${loan.id}`).set(other.auth), 404, 'NOT_FOUND');
  });
});

describe('POST /v1/loans/:id/settle', () => {
  it('records the exact remaining balance once', async () => {
    const loan = await newLoan({ personName: 'Rahul', amount: '5000' });
    await addRepayment(loan.id, 200000);

    const res = await settle(loan.id);
    expect(res.status).toBe(200);
    const body = settleResponseSchema.parse(res.body);
    expect(body.repayment).toMatchObject({ amountPaise: 300000, paidOn: TODAY });
    expect(body.loan).toMatchObject({ outstandingPaise: 0, repaymentStatus: 'REPAID', version: 2 });

    const again = settleResponseSchema.parse((await settle(loan.id)).body);
    expect(again.repayment).toBeNull();
    expect(again.loan.version).toBe(2);
  });

  it('creates a single repayment under concurrent settles', async () => {
    const loan = await newLoan({ personName: 'Rahul', amount: '999.99' });
    const results = await Promise.all(Array.from({ length: 5 }, () => settle(loan.id)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(results.filter((r) => r.body.repayment !== null)).toHaveLength(1);
    expect(await prisma.repayment.count({ where: { loanId: loan.id } })).toBe(1);
  });

  it('rejects a future payment date and foreign loans', async () => {
    const loan = await newLoan({ personName: 'Rahul', amount: '10' });
    expectError(await settle(loan.id, user, { paidOn: '2026-10-23' }), 422, 'VALIDATION_FAILED');
    const other = await signIn(t);
    expectError(await settle(loan.id, other), 404, 'NOT_FOUND');
    expect(await prisma.repayment.count()).toBe(0);
  });
});

describe('GET /v1/summary', () => {
  it('matches the PRD FR-05 example exactly', async () => {
    const overdue = await newLoan({
      personName: 'A',
      amount: '5000',
      loanDate: '2026-10-01',
      dueDate: YESTERDAY,
    });
    await addRepayment(overdue.id, 200000);
    const repaid = await newLoan({ personName: 'B', amount: '3000', dueDate: YESTERDAY });
    await settle(repaid.id);
    const borrowed = await newLoan({
      personName: 'C',
      amount: '4000',
      direction: 'BORROWED',
      dueDate: NEXT_WEEK,
    });
    await addRepayment(borrowed.id, 100000);

    expect(await summary()).toEqual({
      totalLent: 800000,
      totalRepaid: 500000,
      overdueAmount: 300000,
      outstandingLent: 300000,
      totalBorrowed: 400000,
      totalReturned: 100000,
      outstandingBorrowed: 300000,
      overdueBorrowed: 0,
      peopleOwingYou: 1,
      peopleYouOwe: 1,
      lentLoans: 2,
      overdueLoans: 1,
      dueSoonLent: 0,
      dueSoonBorrowed: 0,
      dueSoonLoans: 0,
      currency: 'INR',
      unit: 'paise',
      asOfDate: TODAY,
      timezone: 'Asia/Kolkata',
    });
  });

  it('treats due today as not overdue and updates at the date rollover', async () => {
    await newLoan({ personName: 'A', amount: '100', dueDate: TODAY });
    expect((await summary()).overdueAmount).toBe(0);
    t.clock.set('2026-10-22T18:31:00.000Z'); // 00:01 IST on 23 Oct
    // The 15-minute access token has expired by now; refresh like the app would.
    const refreshed = await request(t.app)
      .post('/v1/auth/refresh')
      .send({ refreshToken: user.refreshToken });
    const renewed = { ...user, auth: { Authorization: `Bearer ${refreshed.body.accessToken}` } };
    const next = await summary(renewed);
    expect(next).toMatchObject({ asOfDate: '2026-10-23', overdueAmount: 10000 });
  });

  it('is zero for a new user and never includes other users', async () => {
    await newLoan({ personName: 'A', amount: '100' });
    const other = await signIn(t);
    expect(await summary(other)).toMatchObject({
      totalLent: 0,
      totalRepaid: 0,
      overdueAmount: 0,
      peopleOwingYou: 0,
      peopleYouOwe: 0,
      lentLoans: 0,
      overdueLoans: 0,
    });
  });

  it('counts distinct people with an open balance and overdue lent loans', async () => {
    const rahul = await newLoan({
      personName: 'Rahul',
      amount: '100',
      loanDate: '2026-10-01',
      dueDate: YESTERDAY,
    });
    await newLoan({ personId: rahul.person.id, amount: '200', dueDate: YESTERDAY });
    const priya = await newLoan({ personName: 'Priya', amount: '300' });
    await settle(priya.id);
    await newLoan({ personId: rahul.person.id, amount: '50', direction: 'BORROWED' });
    expect(await summary()).toMatchObject({
      peopleOwingYou: 1, // Priya is settled; Rahul counted once
      peopleYouOwe: 1,
      lentLoans: 3,
      overdueLoans: 2,
    });
  });

  it('sums outstanding loans due today through today + 6 as due this week', async () => {
    const today = await newLoan({ personName: 'A', amount: '100', dueDate: TODAY });
    await addRepayment(today.id, 4000);
    await newLoan({ personName: 'B', amount: '200', dueDate: '2026-10-28' }); // today + 6
    await newLoan({ personName: 'C', amount: '50', direction: 'BORROWED', dueDate: '2026-10-25' });
    await newLoan({ personName: 'D', amount: '300', dueDate: NEXT_WEEK }); // today + 7: not yet
    await newLoan({ personName: 'E', amount: '400', loanDate: '2026-10-01', dueDate: YESTERDAY }); // overdue
    const done = await newLoan({ personName: 'F', amount: '500', dueDate: TODAY });
    await settle(done.id);
    expect(await summary()).toMatchObject({
      dueSoonLent: 6000 + 20000,
      dueSoonBorrowed: 5000,
      dueSoonLoans: 3,
    });
  });
});

describe('GET /v1/loans', () => {
  /** Five loans created one second apart; settling "Done" last makes it the most recent activity. */
  async function seed() {
    const tick = () => t.clock.advance(1000);
    const overdue = await newLoan({
      personName: 'Overdue',
      amount: '100',
      loanDate: '2026-10-01',
      dueDate: '2026-10-10',
    });
    tick();
    const soon = await newLoan({ personName: 'Soon', amount: '200', dueDate: '2026-10-25' });
    tick();
    const later = await newLoan({ personName: 'Later', amount: '300', dueDate: '2026-11-30' });
    tick();
    const done = await newLoan({
      personName: 'Done',
      amount: '400',
      dueDate: '2026-10-05',
      loanDate: '2026-10-01',
    });
    tick();
    const owed = await newLoan({
      personName: 'Owed',
      amount: '500',
      direction: 'BORROWED',
      dueDate: '2026-10-24',
    });
    tick();
    await settle(done.id);
    return { overdue, soon, later, done, owed };
  }

  const list = async (query = '') => {
    const res = await request(t.app).get(`/v1/loans${query}`).set(user.auth);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return loanListResponseSchema.parse(res.body);
  };
  const names = (body: { items: { person: { name: string } }[] }) =>
    body.items.map((l) => l.person.name);

  it('sorts by attention by default: overdue, then outstanding by due date, then repaid', async () => {
    await seed();
    const body = await list();
    expect(names(body)).toEqual(['Overdue', 'Owed', 'Soon', 'Later', 'Done']);
    expect(body).toMatchObject({ nextCursor: null, asOfDate: TODAY, timezone: 'Asia/Kolkata' });
    expect(body.items[0]).toMatchObject({ isOverdue: true, daysOverdue: 12 });
  });

  it('filters by status, direction and search without changing totals', async () => {
    await seed();
    expect(names(await list('?status=overdue'))).toEqual(['Overdue']);
    expect(names(await list('?status=repaid'))).toEqual(['Done']);
    expect(names(await list('?status=outstanding'))).toEqual(['Overdue', 'Owed', 'Soon', 'Later']);
    expect(names(await list('?direction=BORROWED'))).toEqual(['Owed']);
    expect(names(await list('?search=OO'))).toEqual(['Soon']);
    expect((await summary()).totalLent).toBe(100000);
  });

  it('supports dueDate and recent sorts', async () => {
    await seed();
    expect(names(await list('?sort=dueDate'))).toEqual([
      'Done',
      'Overdue',
      'Owed',
      'Soon',
      'Later',
    ]);
    expect(names(await list('?sort=recent'))).toEqual(['Done', 'Owed', 'Later', 'Soon', 'Overdue']);
  });

  it('paginates with keyset cursors without duplicates or gaps', async () => {
    await seed();
    for (const sort of ['attention', 'dueDate', 'recent']) {
      const all = names(await list(`?sort=${sort}`));
      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const page: Awaited<ReturnType<typeof list>> = await list(
          `?sort=${sort}&limit=2${cursor ? `&cursor=${cursor}` : ''}`,
        );
        expect(page.items.length).toBeLessThanOrEqual(2);
        seen.push(...names(page));
        cursor = page.nextCursor;
      } while (cursor);
      expect(seen).toEqual(all);
    }
  });

  it('rejects malformed cursors and cursors from another sort', async () => {
    await seed();
    const first = await list('?limit=2');
    expectError(
      await request(t.app).get('/v1/loans?cursor=garbage').set(user.auth),
      422,
      'INVALID_CURSOR',
    );
    expectError(
      await request(t.app).get(`/v1/loans?sort=recent&cursor=${first.nextCursor}`).set(user.auth),
      422,
      'INVALID_CURSOR',
    );
  });

  it('shows only the signed-in user’s loans', async () => {
    await seed();
    const other = await signIn(t);
    const res = await request(t.app).get('/v1/loans').set(other.auth);
    expect(res.body.items).toEqual([]);
  });
});

describe('people balances', () => {
  it('shows owes-you and you-owe separately, never netted', async () => {
    const lent = await newLoan({ personName: 'Rahul', amount: '5000' });
    await addRepayment(lent.id, 100000);
    await newLoan({ personId: lent.person.id, amount: '1500', direction: 'BORROWED' });
    const res = await request(t.app).get('/v1/people').set(user.auth);
    expect(res.body.items[0]).toMatchObject({
      name: 'Rahul',
      owesYouPaise: 400000,
      youOwePaise: 150000,
      loanCount: 2,
    });
  });
});
