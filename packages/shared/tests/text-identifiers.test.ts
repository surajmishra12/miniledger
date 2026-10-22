import { describe, expect, it } from 'vitest';

import { maskEmail, maskPhone, normalizeEmail, normalizePhone } from '../src/identifiers';
import { codePointLength, nameKey, normalizeText } from '../src/text';

describe('text helpers', () => {
  it('normalizes whitespace and Unicode form', () => {
    expect(normalizeText('  Rahul   Sharma \n')).toBe('Rahul Sharma');
    // "é" composed vs decomposed normalize to the same NFC string
    expect(normalizeText('Jose\u0301')).toBe('José');
  });

  it('builds case-insensitive keys', () => {
    expect(nameKey('  RAHUL  sharma')).toBe('rahul sharma');
    expect(nameKey('राहुल')).toBe('राहुल');
  });

  it('counts code points, not UTF-16 units', () => {
    expect(codePointLength('😀😀')).toBe(2);
    expect('😀😀'.length).toBe(4);
  });
});

describe('identifiers', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['+91 98765 43210', '+919876543210'],
    ['91-98765-43210', '+919876543210'],
    ['(+91) 9876543210', '+919876543210'],
  ])('normalizes phone %j', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(['12345', '5876543210', '+1 9876543210', '98765432100', 'abc'])(
    'rejects phone %j',
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );

  it('normalizes and validates email', () => {
    expect(normalizeEmail('  Suraj@Example.COM ')).toBe('suraj@example.com');
    expect(normalizeEmail('not-an-email')).toBeNull();
    expect(normalizeEmail(`${'a'.repeat(250)}@x.io`)).toBeNull();
  });

  it('masks destinations', () => {
    expect(maskPhone('+919876543210')).toBe('+91 ••••••3210');
    expect(maskEmail('suraj@example.com')).toBe('s•••@example.com');
  });
});
