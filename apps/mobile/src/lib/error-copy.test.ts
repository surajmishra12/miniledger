import { ApiError, NetworkError } from './api-client';
import { CONNECTION_COPY, errorCopy, isConnectionProblem } from './error-copy';

jest.mock('expo-secure-store', () => ({}));
jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000000' }));

const apiError = (status: number, code: string, details: Record<string, unknown> = {}) =>
  new ApiError(status, code as ApiError['code'], 'server message', {}, details);

describe('errorCopy', () => {
  it('maps ledger conflicts to plain language with amounts', () => {
    expect(errorCopy(apiError(409, 'AMOUNT_EXCEEDS_OUTSTANDING', { maxAmountPaise: 300000 }))).toBe(
      'Maximum is ₹3,000.',
    );
    expect(errorCopy(apiError(409, 'PRINCIPAL_BELOW_REPAID', { minAmountPaise: 40000 }))).toBe(
      "Amount can't be less than ₹400 already repaid.",
    );
    expect(errorCopy(apiError(409, 'PERSON_HAS_LOANS'))).toBe(
      'This person has loans. Archive them instead.',
    );
    expect(errorCopy(apiError(404, 'NOT_FOUND'))).toBe('This item no longer exists.');
  });

  it('never shows the server message or the code', () => {
    const copy = errorCopy(apiError(418, 'SOMETHING_NEW'));
    expect(copy).not.toContain('server message');
    expect(copy).not.toContain('SOMETHING_NEW');
  });

  it('treats network failures and 5xx as connection problems', () => {
    expect(errorCopy(new NetworkError('offline'))).toBe(CONNECTION_COPY);
    expect(isConnectionProblem(new NetworkError('timeout'))).toBe(true);
    expect(isConnectionProblem(apiError(503, 'SERVICE_UNAVAILABLE'))).toBe(true);
    expect(isConnectionProblem(apiError(409, 'ID_CONFLICT'))).toBe(false);
  });
});
