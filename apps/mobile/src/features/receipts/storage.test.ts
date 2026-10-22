import { pendingReceipt, receiptUri, savedReceipt } from './storage';

// Minimal path-only stand-ins for the expo-file-system classes.
jest.mock('expo-file-system', () => {
  const join = (parts: unknown[]) =>
    parts.map((p) => (typeof p === 'string' ? p : (p as { uri: string }).uri)).join('/');
  class Node {
    uri: string;
    exists = false;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
  }
  return {
    File: class extends Node {},
    Directory: class extends Node {},
    Paths: { document: { uri: 'file:///docs' }, cache: { uri: 'file:///cache' } },
  };
});

const USER = '8F14E45F-CEEA-4E1C-9C6B-7A4C1D2E3F40';
const LOAN = '0b8c3f8e-1d0a-4a4e-9a51-4f0c7f6d2a11';

describe('receipt paths', () => {
  it('derives the saved and pending paths from user and loan IDs (arch §8)', () => {
    expect(savedReceipt(USER, LOAN).uri).toBe(
      `file:///docs/receipts/${USER.toLowerCase()}/${LOAN}/receipt.jpg`,
    );
    expect(pendingReceipt(LOAN).uri).toBe(`file:///cache/receipt-pending-${LOAN}.jpg`);
  });

  it('refuses anything that is not a UUID before building a path', () => {
    expect(() => savedReceipt('../other-user', LOAN)).toThrow();
    expect(() => savedReceipt(USER, `${LOAN}/../../x`)).toThrow();
    expect(() => pendingReceipt('')).toThrow();
    expect(receiptUri('not-a-uuid', LOAN)).toBeNull();
  });

  it('reports no receipt when the file does not exist', () => {
    expect(receiptUri(USER, LOAN)).toBeNull();
  });
});
