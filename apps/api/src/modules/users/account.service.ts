/**
 * Account deletion (architecture.md §4.2): one DELETE that cascades to people, loans,
 * repayments, sessions and their REAUTH challenges; LOGIN challenges are anonymized.
 */
import type { AppContext } from '../../context';
import { TX_OPTIONS } from '../../context';
import type { User } from '../../generated/prisma/client';

export async function deleteAccount(ctx: AppContext, user: User): Promise<void> {
  await ctx.prisma.$transaction(async (tx) => {
    // Rows keep counting toward per-IP and daily limits; housekeeping removes them within 24 h.
    await tx.otpChallenge.updateMany({
      where: {
        purpose: 'LOGIN',
        identifierType: user.identifierType,
        identifier: user.identifier,
      },
      data: { identifier: 'deleted', state: 'INVALIDATED' },
    });
    await tx.$executeRaw`DELETE FROM users WHERE id = ${user.id}::uuid`;
  }, TX_OPTIONS);
}
