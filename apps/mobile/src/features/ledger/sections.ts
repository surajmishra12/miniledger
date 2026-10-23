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

export type SectionStats = { count: number; totalPaise: number; complete: boolean };

/**
 * Row count and remaining total per section of an attention-sorted list (design.md S05).
 * A section is `complete` once a later section has started or every page is loaded, so a
 * header never shows a partial total as if it were final.
 */
export function sectionStats(
  loans: Pick<
    LoanDto,
    'repaymentStatus' | 'isOverdue' | 'daysOverdue' | 'dueDate' | 'asOfDate' | 'outstandingPaise'
  >[],
  allLoaded: boolean,
): Partial<Record<LoanSection, SectionStats>> {
  const out: Partial<Record<LoanSection, SectionStats>> = {};
  let last: LoanSection | null = null;
  for (const loan of loans) {
    const section = sectionOf(loan);
    if (last && last !== section) out[last]!.complete = true;
    const entry = (out[section] ??= { count: 0, totalPaise: 0, complete: false });
    entry.count += 1;
    entry.totalPaise += loan.outstandingPaise;
    last = section;
  }
  if (last && allLoaded) out[last]!.complete = true;
  return out;
}
