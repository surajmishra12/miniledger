import { describe, expect, it } from 'vitest';

import { ERROR_CODES, ERROR_STATUS } from '../src/contracts/error-codes';
import {
  createLoanSchema,
  loanListQuerySchema,
  patchLoanSchema,
  peopleListQuerySchema,
} from '../src/schemas/requests';

const id = '0b8c3f8e-1d0a-4a4e-9a51-4f0c7f6d2a11';

describe('createLoanSchema', () => {
  it('accepts the minimal assignment request and applies defaults', () => {
    const result = createLoanSchema.parse({
      id,
      personName: '  Rahul ',
      amount: '5000.00',
      dueDate: '2026-10-30',
    });
    expect(result).toMatchObject({
      id,
      personName: 'Rahul',
      amount: 500000,
      direction: 'LENT',
      dueDate: '2026-10-30',
    });
  });

  it('requires exactly one of personId or personName', () => {
    expect(createLoanSchema.safeParse({ id, amount: '1', dueDate: '2026-10-30' }).success).toBe(
      false,
    );
    expect(
      createLoanSchema.safeParse({
        id,
        personId: id,
        personName: 'Rahul',
        amount: '1',
        dueDate: '2026-10-30',
      }).success,
    ).toBe(false);
  });

  it('rejects unknown fields, invalid amounts and dates', () => {
    const base = { id, personName: 'Rahul', amount: '1', dueDate: '2026-10-30' };
    expect(createLoanSchema.safeParse({ ...base, userId: id }).success).toBe(false);
    expect(createLoanSchema.safeParse({ ...base, amount: '0' }).success).toBe(false);
    expect(createLoanSchema.safeParse({ ...base, amount: 100 }).success).toBe(false);
    expect(createLoanSchema.safeParse({ ...base, dueDate: '2027-02-29' }).success).toBe(false);
  });

  it('turns an empty note into null', () => {
    const result = createLoanSchema.parse({
      id,
      personName: 'Rahul',
      amount: '1',
      dueDate: '2026-10-30',
      note: '   ',
    });
    expect(result.note).toBeNull();
  });
});

describe('patchLoanSchema', () => {
  it('requires a version and at least one change', () => {
    expect(patchLoanSchema.safeParse({ version: 1 }).success).toBe(false);
    expect(patchLoanSchema.safeParse({ dueDate: '2026-10-30' }).success).toBe(false);
    expect(patchLoanSchema.safeParse({ version: 1, note: null }).success).toBe(true);
  });
});

describe('list queries', () => {
  it('applies loan list defaults and bounds', () => {
    expect(loanListQuerySchema.parse({})).toMatchObject({ sort: 'attention', limit: 20 });
    expect(loanListQuerySchema.parse({ limit: '50' }).limit).toBe(50);
    expect(loanListQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
  });

  it('parses the people archived flag', () => {
    expect(peopleListQuerySchema.parse({}).archived).toBe(false);
    expect(peopleListQuerySchema.parse({ archived: 'true' }).archived).toBe(true);
  });
});

describe('error codes', () => {
  it('maps every code to an HTTP error status', () => {
    for (const code of ERROR_CODES) {
      expect(ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });
});
