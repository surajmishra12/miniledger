import { loanDetailDtoSchema, loanDtoSchema, loanMutationResponseSchema } from '@miniledger/shared';
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

const TODAY = '2026-10-22';
const NEXT_WEEK = '2026-10-29';

let t: TestApp;
let user: SignedIn;

beforeEach(async () => {
  await resetDatabase();
  t = createTestApp();
  user = await signIn(t);
});

async function newLoan(amount = '5000', auth = user) {
  const res = await request(t.app)
    .post('/v1/loans')
    .set(auth.auth)
    .send({ id: uuid(), personName: 'Rahul', amount, dueDate: NEXT_WEEK });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return loanDtoSchema.parse(res.body);
}

const repay = (loanId: string, body: Record<string, unknown>, auth = user) =>
  request(t.app).post(`/v1/loans/${loanId}/repayments`).set(auth.auth).send(body);
const patchRepayment = (loanId: string, id: string, body: Record<string, unknown>, auth = user) =>
  request(t.app).patch(`/v1/loans/${loanId}/repayments/${id}`).set(auth.auth).send(body);
const deleteRepayment = (loanId: string, id: string, auth = user) =>
  request(t.app).delete(`/v1/loans/${loanId}/repayments/${id}`).set(auth.auth);

describe('POST /v1/loans/:id/repayments', () => {
  it('records a partial repayment and returns the updated loan', async () => {
    const loan = await newLoan();
    const id = uuid();
    const res = await repay(loan.id, { id, amount: '1500.50', note: ' cash ' });
    expect(res.status).toBe(201);
    const body = loanMutationResponseSchema.parse(res.body);
    expect(body.repayment).toMatchObject({
      id,
      loanId: loan.id,
      amountPaise: 150050,
      paidOn: TODAY,
      note: 'cash',
    });
    expect(body.loan).toMatchObject({
      repaidPaise: 150050,
      outstandingPaise: 349950,
      repaymentStatus: 'PARTIAL',
      version: 2,
    });
  });

  it('replays a retry with the same ID and rejects different content', async () => {
    const loan = await newLoan();
    const body = { id: uuid(), amount: '100', paidOn: '2026-10-20' };
    expect((await repay(loan.id, body)).status).toBe(201);
    const retry = await repay(loan.id, body);
    expect(retry.status).toBe(200);
    expect(retry.body.loan.version).toBe(2);
    expectError(await repay(loan.id, { ...body, amount: '101' }), 409, 'ID_CONFLICT');
    expect(await prisma.repayment.count()).toBe(1);
  });

  it('rejects more than the outstanding balance with the maximum', async () => {
    const loan = await newLoan('1000');
    await repay(loan.id, { id: uuid(), amount: '400' });
    const res = await repay(loan.id, { id: uuid(), amount: '600.01' });
    expectError(res, 409, 'AMOUNT_EXCEEDS_OUTSTANDING');
    expect(res.body.error.details.maxAmountPaise).toBe(60000);
    expect(res.body.error.fieldErrors.amount).toBeDefined();
    expect((await repay(loan.id, { id: uuid(), amount: '600' })).body.loan).toMatchObject({
      outstandingPaise: 0,
      repaymentStatus: 'REPAID',
    });
  });

  it('never exceeds the principal under concurrent repayments', async () => {
    const loan = await newLoan('1000');
    const results = await Promise.all(
      Array.from({ length: 10 }, () => repay(loan.id, { id: uuid(), amount: '300' })),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(3);
    expect(results.filter((r) => r.status === 409)).toHaveLength(7);
    const detail = loanDetailDtoSchema.parse(
      (await request(t.app).get(`/v1/loans/${loan.id}`).set(user.auth)).body,
    );
    expect(detail.repaidPaise).toBe(90000);
    expect(detail.repayments).toHaveLength(3);
  });

  it('validates the date and amount, and hides foreign loans', async () => {
    const loan = await newLoan();
    expectError(
      await repay(loan.id, { id: uuid(), amount: '1', paidOn: '2026-10-23' }),
      422,
      'VALIDATION_FAILED',
    );
    expectError(await repay(loan.id, { id: uuid(), amount: '0' }), 422, 'VALIDATION_FAILED');
    const other = await signIn(t);
    expectError(await repay(loan.id, { id: uuid(), amount: '1' }, other), 404, 'NOT_FOUND');
    expectError(await repay(uuid(), { id: uuid(), amount: '1' }), 404, 'NOT_FOUND');
    expect(await prisma.repayment.count()).toBe(0);
  });
});

describe('PATCH /v1/loans/:id/repayments/:repaymentId', () => {
  it('edits within the remaining balance plus the current amount', async () => {
    const loan = await newLoan('1000');
    const first = uuid();
    await repay(loan.id, { id: first, amount: '400' });
    await repay(loan.id, { id: uuid(), amount: '500' });

    // Remaining 100 + current 400 = 500 available.
    const tooMuch = await patchRepayment(loan.id, first, { amount: '500.01' });
    expectError(tooMuch, 409, 'AMOUNT_EXCEEDS_OUTSTANDING');
    expect(tooMuch.body.error.details.maxAmountPaise).toBe(50000);

    const res = await patchRepayment(loan.id, first, {
      amount: '500',
      paidOn: '2026-10-01',
      note: 'bank transfer',
    });
    expect(res.status).toBe(200);
    const body = loanMutationResponseSchema.parse(res.body);
    expect(body.repayment).toMatchObject({
      amountPaise: 50000,
      paidOn: '2026-10-01',
      note: 'bank transfer',
    });
    expect(body.loan).toMatchObject({ outstandingPaise: 0, repaymentStatus: 'REPAID', version: 4 });

    const cleared = await patchRepayment(loan.id, first, { note: null });
    expect(cleared.body.repayment.note).toBeNull();
  });

  it('rejects future dates, empty bodies and foreign or mismatched IDs', async () => {
    const loan = await newLoan();
    const id = uuid();
    await repay(loan.id, { id, amount: '1' });
    expectError(
      await patchRepayment(loan.id, id, { paidOn: '2026-10-23' }),
      422,
      'VALIDATION_FAILED',
    );
    expectError(await patchRepayment(loan.id, id, {}), 422, 'VALIDATION_FAILED');

    const otherLoan = await newLoan();
    expectError(await patchRepayment(otherLoan.id, id, { amount: '2' }), 404, 'NOT_FOUND');
    const other = await signIn(t);
    expectError(await patchRepayment(loan.id, id, { amount: '2' }, other), 404, 'NOT_FOUND');
  });
});

describe('DELETE /v1/loans/:id/repayments/:repaymentId', () => {
  it('removes the repayment and reopens the balance', async () => {
    const loan = await newLoan('1000');
    const settled = await request(t.app).post(`/v1/loans/${loan.id}/settle`).set(user.auth);
    const repaymentId = settled.body.repayment.id as string;

    const other = await signIn(t);
    expectError(await deleteRepayment(loan.id, repaymentId, other), 404, 'NOT_FOUND');

    expect((await deleteRepayment(loan.id, repaymentId)).status).toBe(204);
    expectError(await deleteRepayment(loan.id, repaymentId), 404, 'NOT_FOUND');

    const detail = loanDetailDtoSchema.parse(
      (await request(t.app).get(`/v1/loans/${loan.id}`).set(user.auth)).body,
    );
    expect(detail).toMatchObject({
      repaidPaise: 0,
      outstandingPaise: 100000,
      repaymentStatus: 'UNPAID',
      version: 3,
      repayments: [],
    });
  });
});
