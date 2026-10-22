import { describe, expect, it } from 'vitest';

import {
  formatPaise,
  MAX_PAISE,
  MONEY_MESSAGES,
  paiseToRupeesInput,
  parseRupeesToPaise,
} from '../src/money';

describe('parseRupeesToPaise', () => {
  it.each([
    ['5000', 500000],
    ['5000.5', 500050],
    ['5000.50', 500050],
    ['  250.05  ', 25005],
    ['007.50', 750],
    ['0.01', 1],
    ['10000000.00', MAX_PAISE],
  ])('parses %j to %d paise', (input, paise) => {
    expect(parseRupeesToPaise(input)).toEqual({ ok: true, paise });
  });

  it.each([
    ['0', MONEY_MESSAGES.zero],
    ['0.00', MONEY_MESSAGES.zero],
    ['', MONEY_MESSAGES.required],
    ['   ', MONEY_MESSAGES.required],
    ['-5', MONEY_MESSAGES.invalid],
    ['.5', MONEY_MESSAGES.invalid],
    ['5.', MONEY_MESSAGES.invalid],
    ['1e3', MONEY_MESSAGES.invalid],
    ['1,000', MONEY_MESSAGES.invalid],
    ['₹500', MONEY_MESSAGES.invalid],
    ['500.123', MONEY_MESSAGES.decimals],
    ['10000000.01', MONEY_MESSAGES.tooLarge],
    ['999999999', MONEY_MESSAGES.tooLarge],
    ['12345678901234567', MONEY_MESSAGES.tooLarge],
  ])('rejects %j', (input, error) => {
    expect(parseRupeesToPaise(input)).toEqual({ ok: false, error });
  });

  it('rejects non-strings, including JSON numbers', () => {
    expect(parseRupeesToPaise(5000)).toEqual({ ok: false, error: MONEY_MESSAGES.invalid });
    expect(parseRupeesToPaise(null)).toEqual({ ok: false, error: MONEY_MESSAGES.invalid });
  });
});

describe('formatPaise', () => {
  it.each([
    [0, '₹0'],
    [100, '₹1'],
    [25050, '₹250.50'],
    [25005, '₹250.05'],
    [500000, '₹5,000'],
    [12500050, '₹1,25,000.50'],
    [MAX_PAISE, '₹1,00,00,000'],
    [-300000, '-₹3,000'],
  ])('formats %d as %s', (paise, text) => {
    expect(formatPaise(paise)).toBe(text);
  });

  it('rejects non-integers', () => {
    expect(() => formatPaise(1.5)).toThrow(RangeError);
  });
});

describe('paiseToRupeesInput', () => {
  it('round-trips with the parser', () => {
    for (const paise of [1, 99, 100, 500050, MAX_PAISE]) {
      const result = parseRupeesToPaise(paiseToRupeesInput(paise));
      expect(result).toEqual({ ok: true, paise });
    }
  });
});
