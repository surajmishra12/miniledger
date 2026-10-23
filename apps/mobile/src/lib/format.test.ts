import {
  addOneMonth,
  balanceLines,
  duePresets,
  dueStatus,
  endOfMonth,
  formatDateLong,
  formatDateShort,
  initials,
  plural,
  quickAmounts,
  repaidShare,
  repaymentMaxPaise,
} from './format';

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

describe('balanceLines', () => {
  it('shows each direction separately and never nets them', () => {
    expect(balanceLines({ owesYouPaise: 400000, youOwePaise: 150000 })).toEqual([
      'Owes you ₹4,000',
      'You owe ₹1,500',
    ]);
    expect(balanceLines({ owesYouPaise: 0, youOwePaise: 5050 })).toEqual(['You owe ₹50.50']);
    expect(balanceLines({ owesYouPaise: 0, youOwePaise: 0 })).toEqual(['Settled']);
  });
});

describe('plural and repaidShare', () => {
  it('uses singular for one and the given plural otherwise', () => {
    expect(plural(1, 'loan')).toBe('1 loan');
    expect(plural(3, 'loan')).toBe('3 loans');
    expect(plural(2, 'person', 'people')).toBe('2 people');
  });

  it('rounds the received share down and hides it when nothing was lent', () => {
    expect(repaidShare(555000, 1800000)).toBe(30);
    expect(repaidShare(1800000, 1800000)).toBe(100);
    expect(repaidShare(0, 0)).toBeNull();
  });
});

describe('repaymentMaxPaise', () => {
  it('adds the edited repayment back to the remaining balance', () => {
    expect(repaymentMaxPaise(10000)).toBe(10000);
    expect(repaymentMaxPaise(10000, 40000)).toBe(50000);
  });
});

describe('duePresets', () => {
  it('counts from the loan date and clamps month ends', () => {
    expect(duePresets('2026-10-22').map((p) => p.date)).toEqual([
      '2026-10-29',
      '2026-11-05',
      '2026-11-22',
      '2026-10-31',
    ]);
    expect(addOneMonth('2027-01-31')).toBe('2027-02-28');
    expect(addOneMonth('2026-12-15')).toBe('2027-01-15');
    expect(endOfMonth('2026-10-31')).toBe('2026-11-30');
    expect(endOfMonth('2026-12-31')).toBe('2027-01-31');
  });
});

describe('quickAmounts', () => {
  it('rounds shares down to the rupee and always offers the exact full amount', () => {
    expect(quickAmounts(300050)).toEqual([
      { key: '25', label: '25%', paise: 75000 },
      { key: '50', label: '50%', paise: 150000 },
      { key: 'full', label: 'Full', paise: 300050 },
    ]);
    expect(quickAmounts(150)).toEqual([{ key: 'full', label: 'Full', paise: 150 }]);
  });
});
