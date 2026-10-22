import { peopleRows } from './people-rows';
import { buildLoanItems, filterSummary, sectionOf } from './sections';

const base = { asOfDate: '2026-10-22', daysOverdue: 0, isOverdue: false };
const loan = (id: string, over: Record<string, unknown>) =>
  ({ id, repaymentStatus: 'UNPAID' as const, dueDate: '2026-11-30', ...base, ...over }) as const;

describe('sectionOf', () => {
  it('maps each loan to its urgency section', () => {
    expect(sectionOf(loan('a', { isOverdue: true, daysOverdue: 3, dueDate: '2026-10-19' }))).toBe(
      'overdue',
    );
    expect(sectionOf(loan('b', { dueDate: '2026-10-22' }))).toBe('soon');
    expect(sectionOf(loan('c', { dueDate: '2026-10-23' }))).toBe('soon');
    expect(sectionOf(loan('d', { dueDate: '2026-10-30' }))).toBe('upcoming');
    expect(sectionOf(loan('e', { repaymentStatus: 'REPAID', dueDate: '2026-10-01' }))).toBe(
      'repaid',
    );
  });
});

describe('buildLoanItems', () => {
  const loans = [
    loan('o1', { isOverdue: true, daysOverdue: 2, dueDate: '2026-10-20' }),
    loan('o2', { isOverdue: true, daysOverdue: 1, dueDate: '2026-10-21' }),
    loan('u1', { dueDate: '2026-11-30' }),
    loan('r1', { repaymentStatus: 'REPAID' }),
  ];

  it('inserts a header at each section change and marks group edges', () => {
    const items = buildLoanItems(loans, true);
    expect(
      items.map((i) =>
        i.kind === 'section'
          ? `#${i.section}`
          : `${i.loan.id}${i.first ? '^' : ''}${i.last ? '$' : ''}`,
      ),
    ).toEqual(['#overdue', 'o1^', 'o2$', '#upcoming', 'u1^$', '#repaid', 'r1^$']);
  });

  it('returns one ungrouped run for other sorts', () => {
    const items = buildLoanItems(loans, false);
    expect(items.every((i) => i.kind === 'loan')).toBe(true);
    expect(items[0]).toMatchObject({ first: true, last: false });
    expect(items[3]).toMatchObject({ first: false, last: true });
  });
});

describe('filterSummary', () => {
  it('describes a narrowed list and is silent for defaults', () => {
    expect(filterSummary({})).toBeNull();
    expect(filterSummary({ direction: 'LENT', status: 'overdue' })).toBe('Showing lent · overdue');
    expect(filterSummary({ search: 'rah' })).toBe('Showing “rah”');
  });
});

describe('peopleRows', () => {
  const person = (id: string, owesYouPaise: number, youOwePaise = 0) =>
    ({ id, name: id, owesYouPaise, youOwePaise }) as never;

  it('lists people with a balance before settled people, under headers', () => {
    const rows = peopleRows([person('A', 0), person('B', 500), person('C', 0, 200)], true);
    expect(rows.map((r) => (r.kind === 'section' ? `#${r.title}` : r.person.id))).toEqual([
      '#With a balance',
      'B',
      'C',
      '#Settled',
      'A',
    ]);
  });

  it('skips headers when everyone is in one group or sections are off', () => {
    expect(
      peopleRows([person('A', 1), person('B', 2)], true).some((r) => r.kind === 'section'),
    ).toBe(false);
    expect(peopleRows([person('A', 0), person('B', 2)], false).map((r) => r.kind)).toEqual([
      'person',
      'person',
    ]);
  });
});
