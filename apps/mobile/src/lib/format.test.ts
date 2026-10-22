import { dueStatus, formatDateLong, formatDateShort, initials } from './format';

const base = {
  repaymentStatus: 'UNPAID' as const,
  isOverdue: false,
  daysOverdue: 0,
  asOfDate: '2026-10-22',
};

describe('dueStatus', () => {
  it.each([
    [{ dueDate: '2026-10-22' }, 'Due today', 'warning'],
    [{ dueDate: '2026-10-23' }, 'Due tomorrow', 'warning'],
    [{ dueDate: '2026-10-30' }, 'Due in 8 days', 'neutral'],
    [{ dueDate: '2026-10-21', isOverdue: true, daysOverdue: 1 }, '1 day overdue', 'danger'],
    [{ dueDate: '2026-10-14', isOverdue: true, daysOverdue: 8 }, '8 days overdue', 'danger'],
    [{ dueDate: '2026-10-14', repaymentStatus: 'REPAID' as const }, 'Repaid', 'success'],
  ])('labels %j', (overrides, label, tone) => {
    expect(dueStatus({ ...base, ...overrides })).toEqual({ label, tone });
  });
});

describe('dates', () => {
  it('omits the year in the current year', () => {
    expect(formatDateShort('2026-10-22', '2026-12-01')).toBe('22 Oct');
    expect(formatDateShort('2025-01-05', '2026-12-01')).toBe('5 Jan 2025');
    expect(formatDateLong('2026-10-30')).toBe('30 October 2026');
  });
});

describe('initials', () => {
  it('uses first and last words', () => {
    expect(initials('rahul kumar sharma')).toBe('RS');
    expect(initials('  Priya ')).toBe('P');
    expect(initials('राहुल शर्मा')).toBe('राश');
    expect(initials('')).toBe('?');
  });
});
