import { loanDtoSchema, personDtoSchema } from '@miniledger/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

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

const NEXT_WEEK = '2026-10-29';

let t: TestApp;
let user: SignedIn;

beforeEach(async () => {
  await resetDatabase();
  t = createTestApp();
  user = await signIn(t);
});

async function newLoan(body: Record<string, unknown> = {}, auth = user) {
  const res = await request(t.app)
    .post('/v1/loans')
    .set(auth.auth)
    .send({ id: uuid(), personName: 'Rahul', amount: '1000', dueDate: NEXT_WEEK, ...body });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return loanDtoSchema.parse(res.body);
}

async function newPerson(name: string, auth = user) {
  const res = await request(t.app).post('/v1/people').set(auth.auth).send({ id: uuid(), name });
  expect(res.status).toBe(201);
  return personDtoSchema.parse(res.body);
}

const patchLoan = (id: string, body: Record<string, unknown>, auth = user) =>
  request(t.app).patch(`/v1/loans/${id}`).set(auth.auth).send(body);
const repay = (loanId: string, amount: string) =>
  request(t.app).post(`/v1/loans/${loanId}/repayments`).set(user.auth).send({ id: uuid(), amount });
const patchPerson = (id: string, body: Record<string, unknown>, auth = user) =>
  request(t.app).patch(`/v1/people/${id}`).set(auth.auth).send(body);

describe('PATCH /v1/loans/:id', () => {
  it('edits fields and bumps the version', async () => {
    const loan = await newLoan();
    const res = await patchLoan(loan.id, {
      version: 1,
      amount: '1200.50',
      dueDate: '2026-10-01',
      loanDate: '2026-09-15',
      note: 'trip',
      direction: 'BORROWED',
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(loanDtoSchema.parse(res.body)).toMatchObject({
      principalPaise: 120050,
      dueDate: '2026-10-01',
      loanDate: '2026-09-15',
      note: 'trip',
      direction: 'BORROWED',
      isOverdue: true,
      version: 2,
    });
  });

  it('rejects a stale version with the current one', async () => {
    const loan = await newLoan();
    await patchLoan(loan.id, { version: 1, note: 'a' });
    const stale = await patchLoan(loan.id, { version: 1, note: 'b' });
    expectError(stale, 409, 'RECORD_CHANGED');
    expect(stale.body.error.details.currentVersion).toBe(2);
  });

  it('locks direction and floors the amount once repayments exist', async () => {
    const loan = await newLoan();
    await repay(loan.id, '400');
    expectError(
      await patchLoan(loan.id, { version: 2, direction: 'BORROWED' }),
      409,
      'DIRECTION_LOCKED',
    );
    const below = await patchLoan(loan.id, { version: 2, amount: '399.99' });
    expectError(below, 409, 'PRINCIPAL_BELOW_REPAID');
    expect(below.body.error.details.minAmountPaise).toBe(40000);
    // Same direction is not a change.
    const ok = await patchLoan(loan.id, { version: 2, direction: 'LENT', amount: '400' });
    expect(ok.body).toMatchObject({ outstandingPaise: 0, repaymentStatus: 'REPAID' });
  });

  it('reassigns to another active person only', async () => {
    const loan = await newLoan();
    const priya = await newPerson('Priya');
    const moved = await patchLoan(loan.id, { version: 1, personId: priya.id });
    expect(moved.body.person).toMatchObject({ id: priya.id, name: 'Priya' });

    const archived = await newPerson('Old');
    await patchPerson(archived.id, { archived: true });
    expectError(
      await patchLoan(loan.id, { version: 2, personId: archived.id }),
      409,
      'PERSON_ARCHIVED',
    );
    const foreign = await newPerson('Theirs', await signIn(t));
    expectError(await patchLoan(loan.id, { version: 2, personId: foreign.id }), 404, 'NOT_FOUND');
  });

  it('validates the body and hides foreign loans', async () => {
    const loan = await newLoan();
    expectError(await patchLoan(loan.id, { version: 1 }), 422, 'VALIDATION_FAILED');
    expectError(await patchLoan(loan.id, { note: 'x' }), 422, 'VALIDATION_FAILED');
    expectError(
      await patchLoan(loan.id, { version: 1, loanDate: '2026-10-23' }),
      422,
      'VALIDATION_FAILED',
    );
    expectError(
      await patchLoan(loan.id, { version: 1, note: 'x' }, await signIn(t)),
      404,
      'NOT_FOUND',
    );
  });
});

describe('DELETE /v1/loans/:id', () => {
  it('permanently deletes the loan and its repayments', async () => {
    const loan = await newLoan();
    await repay(loan.id, '100');
    const other = await signIn(t);
    expectError(
      await request(t.app).delete(`/v1/loans/${loan.id}`).set(other.auth),
      404,
      'NOT_FOUND',
    );

    expect((await request(t.app).delete(`/v1/loans/${loan.id}`).set(user.auth)).status).toBe(204);
    expect(await prisma.loan.count()).toBe(0);
    expect(await prisma.repayment.count()).toBe(0);
    expect(await prisma.person.count()).toBe(1); // the person stays
    expectError(await request(t.app).get(`/v1/loans/${loan.id}`).set(user.auth), 404, 'NOT_FOUND');
  });
});

describe('GET/PATCH/DELETE /v1/people/:id', () => {
  it('returns one person with balances', async () => {
    const loan = await newLoan();
    await repay(loan.id, '250');
    const res = await request(t.app).get(`/v1/people/${loan.person.id}`).set(user.auth);
    expect(personDtoSchema.parse(res.body)).toMatchObject({
      name: 'Rahul',
      owesYouPaise: 75000,
      youOwePaise: 0,
      loanCount: 1,
    });
    expectError(
      await request(t.app)
        .get(`/v1/people/${loan.person.id}`)
        .set((await signIn(t)).auth),
      404,
      'NOT_FOUND',
    );
  });

  it('renames, archives and unarchives while loans stay linked', async () => {
    const loan = await newLoan();
    const renamed = await patchPerson(loan.person.id, { name: '  Rahul  K ' });
    expect(renamed.body).toMatchObject({ name: 'Rahul K', archived: false });

    const archived = await patchPerson(loan.person.id, { archived: true });
    expect(archived.body).toMatchObject({ archived: true, archivedAt: expect.any(String) });
    const again = await patchPerson(loan.person.id, { archived: true });
    expect(again.body.archivedAt).toBe(archived.body.archivedAt);

    const detail = await request(t.app).get(`/v1/loans/${loan.id}`).set(user.auth);
    expect(detail.body.person).toMatchObject({ name: 'Rahul K', archived: true });

    const restored = await patchPerson(loan.person.id, { archived: false });
    expect(restored.body).toMatchObject({ archived: false, archivedAt: null });

    expectError(await patchPerson(loan.person.id, {}), 422, 'VALIDATION_FAILED');
    expectError(
      await patchPerson(loan.person.id, { name: 'X' }, await signIn(t)),
      404,
      'NOT_FOUND',
    );
  });

  it('deletes only people without loans', async () => {
    const loan = await newLoan();
    expectError(
      await request(t.app).delete(`/v1/people/${loan.person.id}`).set(user.auth),
      409,
      'PERSON_HAS_LOANS',
    );

    const lonely = await newPerson('Lonely');
    expectError(
      await request(t.app)
        .delete(`/v1/people/${lonely.id}`)
        .set((await signIn(t)).auth),
      404,
      'NOT_FOUND',
    );
    expect((await request(t.app).delete(`/v1/people/${lonely.id}`).set(user.auth)).status).toBe(
      204,
    );
    expectError(
      await request(t.app).delete(`/v1/people/${lonely.id}`).set(user.auth),
      404,
      'NOT_FOUND',
    );
    expect(await prisma.person.count()).toBe(1);
  });
});
