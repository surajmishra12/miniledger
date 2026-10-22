import { describe, expect, it } from 'vitest';

import { addDays, daysBetween, isCalendarDate, isSupportedDate } from '../src/dates';

describe('isCalendarDate', () => {
  it.each(['2026-10-22', '2028-02-29', '2000-01-01', '2099-12-31'])('accepts %s', (value) => {
    expect(isCalendarDate(value)).toBe(true);
  });

  it.each(['2027-02-29', '2026-13-01', '2026-04-31', '2026-1-5', '22-10-2026', '', 20261022])(
    'rejects %j',
    (value) => {
      expect(isCalendarDate(value)).toBe(false);
    },
  );
});

describe('isSupportedDate', () => {
  it('enforces the 2000–2099 range', () => {
    expect(isSupportedDate('1999-12-31')).toBe(false);
    expect(isSupportedDate('2000-01-01')).toBe(true);
    expect(isSupportedDate('2099-12-31')).toBe(true);
    expect(isSupportedDate('2100-01-01')).toBe(false);
  });
});

describe('date arithmetic', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-10-21', '2026-10-22')).toBe(1);
    expect(daysBetween('2026-10-22', '2026-10-22')).toBe(0);
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2026-10-30', '2026-10-22')).toBe(-8);
  });

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });
});
