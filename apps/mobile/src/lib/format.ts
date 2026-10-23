/**
 * Display helpers (design.md §1.3, §11). Deterministic; no Intl dependency for dates.
 */
import {
  addDays,
  daysBetween,
  formatPaise,
  type LoanDto,
  type PersonDto,
} from '@miniledger/shared';

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split('-').map(Number);
  return [y ?? 0, m ?? 1, d ?? 1];
}

/** "22 Oct", or "22 Oct 2025" when not in the reference year. */
export function formatDateShort(date: string, today: string): string {
  const [y, m, d] = parts(date);
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return `${d} ${MONTHS_SHORT[m - 1]}${sameYear ? '' : ` ${y}`}`;
}

/** "22 October 2026". */
export function formatDateLong(date: string): string {
  const [y, m, d] = parts(date);
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

export type Tone = 'danger' | 'warning' | 'success' | 'neutral';

/** "1 loan" / "3 loans", "1 person" / "2 people" (design.md §11 plural rules). */
export const plural = (n: number, word: string, many = `${word}s`) =>
  `${n} ${n === 1 ? word : many}`;

/** Whole percent of lent money received, rounded down; null when nothing was lent (S04). */
export function repaidShare(totalRepaidPaise: number, totalLentPaise: number): number | null {
  if (totalLentPaise <= 0) return null;
  return Math.floor((totalRepaidPaise * 100) / totalLentPaise);
}

/** Exact due-status labels (design.md §1.3) from server-computed fields. */
export function dueStatus(
  loan: Pick<LoanDto, 'repaymentStatus' | 'isOverdue' | 'daysOverdue' | 'dueDate' | 'asOfDate'>,
): { label: string; tone: Tone } {
  if (loan.repaymentStatus === 'REPAID') return { label: 'Repaid', tone: 'success' };
  if (loan.isOverdue)
    return { label: `${plural(loan.daysOverdue, 'day')} overdue`, tone: 'danger' };
  const days = daysBetween(loan.asOfDate, loan.dueDate);
  if (days <= 0) return { label: 'Due today', tone: 'warning' };
  if (days === 1) return { label: 'Due tomorrow', tone: 'warning' };
  return { label: `Due in ${plural(days, 'day')}`, tone: 'neutral' };
}

function graphemes(value: string): string[] {
  const Segmenter = (
    Intl as unknown as {
      Segmenter?: new (
        locale?: string,
        options?: { granularity: 'grapheme' },
      ) => { segment(input: string): Iterable<{ segment: string }> };
    }
  ).Segmenter;
  if (Segmenter) {
    return Array.from(
      new Segmenter(undefined, { granularity: 'grapheme' }).segment(value),
      (s) => s.segment,
    );
  }
  return Array.from(value);
}

/** First grapheme of the first and last words, uppercased where the script has case. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = graphemes(words[0]!)[0] ?? '';
  const last = words.length > 1 ? (graphemes(words[words.length - 1]!)[0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/** Device IANA timezone, or null if unavailable. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/** Today's date on the device (only for picker defaults; the server owns "today" for money). */
export function deviceToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** YYYY-MM-DD ↔ local Date for the native date picker. */
export function dateFromIso(value: string): Date {
  const [y, m, d] = parts(value);
  return new Date(y, m - 1, d);
}

export function isoFromDate(value: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export type BalanceLine = { kind: 'lent' | 'borrowed' | 'settled'; label: string; amount: string };

/**
 * Person balances as separate figures per direction, never netted (design.md S09).
 * Colour goes on the label; the amount stays neutral (§2.3).
 */
export function balanceItems(
  person: Pick<PersonDto, 'owesYouPaise' | 'youOwePaise'>,
): BalanceLine[] {
  const lines: BalanceLine[] = [];
  if (person.owesYouPaise > 0) {
    lines.push({ kind: 'lent', label: 'Owes you', amount: formatPaise(person.owesYouPaise) });
  }
  if (person.youOwePaise > 0) {
    lines.push({ kind: 'borrowed', label: 'You owe', amount: formatPaise(person.youOwePaise) });
  }
  return lines.length ? lines : [{ kind: 'settled', label: 'Settled', amount: '' }];
}

/** Spoken/plain form of {@link balanceItems}. */
export function balanceLines(person: Pick<PersonDto, 'owesYouPaise' | 'youOwePaise'>): string[] {
  return balanceItems(person).map((l) => (l.amount ? `${l.label} ${l.amount}` : l.label));
}

/** Largest repayment allowed: remaining balance, plus the edited repayment's own amount (S08). */
export function repaymentMaxPaise(outstandingPaise: number, editingAmountPaise = 0): number {
  return outstandingPaise + editingAmountPaise;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Same day next month, clamped to the month's length (31 Jan → 28/29 Feb). */
export function addOneMonth(date: string): string {
  const [y, m, d] = parts(date);
  const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1];
  return iso(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** Last day of the date's month; on the last day itself, the end of the next month. */
export function endOfMonth(date: string): string {
  const [y, m, d] = parts(date);
  const last = daysInMonth(y, m);
  if (d < last) return iso(y, m, last);
  const [ny, nm] = m === 12 ? [y + 1, 1] : [y, m + 1];
  return iso(ny, nm, daysInMonth(ny, nm));
}

export type DuePreset = { key: string; label: string; date: string };

/** Quick due dates counted from the loan date (design.md S06 field 5). */
export function duePresets(loanDate: string): DuePreset[] {
  return [
    { key: '1w', label: '1 week', date: addDays(loanDate, 7) },
    { key: '2w', label: '2 weeks', date: addDays(loanDate, 14) },
    { key: '1m', label: '1 month', date: addOneMonth(loanDate) },
    { key: 'eom', label: 'End of month', date: endOfMonth(loanDate) },
  ];
}

/**
 * Quick repayment amounts as rupee input strings (design.md S08): 25% and 50% rounded down to
 * the rupee (hidden when that is ₹0), Full is the exact remaining balance.
 */
export function quickAmounts(
  outstandingPaise: number,
): { key: string; label: string; paise: number }[] {
  const share = (pct: number) => Math.floor((outstandingPaise * pct) / 100 / 100) * 100;
  const out = [
    { key: '25', label: '25%', paise: share(25) },
    { key: '50', label: '50%', paise: share(50) },
  ].filter((q) => q.paise > 0 && q.paise < outstandingPaise);
  return [...out, { key: 'full', label: 'Full', paise: outstandingPaise }];
}
