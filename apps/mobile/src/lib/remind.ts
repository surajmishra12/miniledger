/**
 * Polite reminders the user sends from their own messaging apps via the Android share sheet
 * (design.md S04, S07, S10). Nothing is sent by MiniLedger itself.
 */
import { formatPaise, type LoanDto } from '@miniledger/shared';
import { Share } from 'react-native';

import { formatDateShort } from './format';
import { haptics } from './haptics';

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function loanReminder(
  loan: Pick<LoanDto, 'person' | 'outstandingPaise' | 'dueDate' | 'asOfDate'>,
): string {
  const amount = formatPaise(loan.outstandingPaise);
  const due = formatDateShort(loan.dueDate, loan.asOfDate);
  return `Hi ${firstName(loan.person.name)}, a gentle reminder about the ${amount} I lent you (due ${due}). Could you send it when you get a chance? Thanks!`;
}

export function personReminder(name: string, owesYouPaise: number): string {
  return `Hi ${firstName(name)}, a gentle reminder about the ${formatPaise(owesYouPaise)} you owe me. Could you send it when you get a chance? Thanks!`;
}

/** Opens the share sheet; dismissing it is not an error. */
export async function shareReminder(message: string): Promise<void> {
  haptics.selection();
  try {
    await Share.share({ message });
  } catch {
    // Share sheet unavailable or dismissed; nothing to undo.
  }
}
