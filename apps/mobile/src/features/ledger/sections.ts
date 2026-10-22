import type { LoanDto } from '@miniledger/shared';

import { dueStatus } from '@/lib/format';

export type LoanSection = 'overdue' | 'soon' | 'upcoming' | 'repaid';

/** Which Needs-attention section a loan belongs to (design.md S05). */
export function sectionOf(
  loan: Pick<LoanDto, 'repaymentStatus' | 'isOverdue' | 'daysOverdue' | 'dueDate' | 'asOfDate'>,
): LoanSection {
  if (loan.repaymentStatus === 'REPAID') return 'repaid';
  if (loan.isOverdue) return 'overdue';
  return dueStatus(loan).tone === 'warning' ? 'soon' : 'upcoming';
}

export type ListItem<T> =
  | { kind: 'section'; section: LoanSection }
  | { kind: 'loan'; loan: T; first: boolean; last: boolean };

/**
 * Turns an attention-sorted page list into rows with section headers and group edges.
 * With `grouped=false` (other sorts) it returns one ungrouped run.
 */
export function buildLoanItems<
  T extends Pick<
    LoanDto,
    'id' | 'repaymentStatus' | 'isOverdue' | 'daysOverdue' | 'dueDate' | 'asOfDate'
  >,
>(loans: T[], grouped: boolean): ListItem<T>[] {
  const out: ListItem<T>[] = [];
  loans.forEach((loan, i) => {
    const section = sectionOf(loan);
    const prev = loans[i - 1];
    const next = loans[i + 1];
    const startsSection = grouped && (!prev || sectionOf(prev) !== section);
    const endsSection = grouped && (!next || sectionOf(next) !== section);
    if (startsSection) out.push({ kind: 'section', section });
    out.push({
      kind: 'loan',
      loan,
      first: grouped ? startsSection : i === 0,
      last: grouped ? endsSection : i === loans.length - 1,
    });
  });
  return out;
}

/** "Showing lent · overdue · “rah”" for a narrowed list; null when filters are default. */
export function filterSummary(filters: {
  direction?: 'LENT' | 'BORROWED' | undefined;
  status?: 'outstanding' | 'overdue' | 'repaid' | undefined;
  search?: string | undefined;
}): string | null {
  const parts: string[] = [];
  if (filters.direction) parts.push(filters.direction === 'LENT' ? 'lent' : 'borrowed');
  if (filters.status) parts.push(filters.status);
  if (filters.search) parts.push(`“${filters.search}”`);
  return parts.length ? `Showing ${parts.join(' · ')}` : null;
}
