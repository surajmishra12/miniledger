/**
 * Device-only receipt files (architecture.md §8). The filesystem is the index:
 *   <Paths.document>/receipts/<userId>/<loanId>/receipt.jpg   saved receipt
 *   <Paths.cache>/receipt-pending-<loanId>.jpg                picked while the loan is unsaved
 * IDs are validated before any path is built; paths never leave the device.
 */
import { Directory, File, Paths } from 'expo-file-system';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function checked(id: string): string {
  if (!UUID.test(id)) throw new Error('Invalid ID for a receipt path');
  return id.toLowerCase();
}

const userDir = (userId: string) => new Directory(Paths.document, 'receipts', checked(userId));
const loanDir = (userId: string, loanId: string) => new Directory(userDir(userId), checked(loanId));

export const savedReceipt = (userId: string, loanId: string) =>
  new File(loanDir(userId, loanId), 'receipt.jpg');

export const pendingReceipt = (loanId: string) =>
  new File(Paths.cache, `receipt-pending-${checked(loanId)}.jpg`);

/** URI of the saved receipt, or null if this device has none for this user and loan. */
export function receiptUri(userId: string, loanId: string): string | null {
  try {
    const file = savedReceipt(userId, loanId);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/** Existing loan: write a temp file, replace the old receipt, then rename (§8). */
export function replaceReceipt(userId: string, loanId: string, source: File): void {
  const dir = loanDir(userId, loanId);
  dir.create({ intermediates: true, idempotent: true });
  const temp = new File(dir, 'receipt.tmp.jpg');
  if (temp.exists) temp.delete();
  source.copySync(temp);
  const target = savedReceipt(userId, loanId);
  if (target.exists) target.delete();
  temp.rename('receipt.jpg');
}

/** New loan: after the server confirms the create, move the pending cache file into place. */
export function commitPendingReceipt(userId: string, loanId: string): boolean {
  const pending = pendingReceipt(loanId);
  if (!pending.exists) return true;
  try {
    replaceReceipt(userId, loanId, pending);
    pending.delete();
    return true;
  } catch {
    return false;
  }
}

export function discardPendingReceipt(loanId: string): void {
  try {
    const pending = pendingReceipt(loanId);
    if (pending.exists) pending.delete();
  } catch {
    // OS-managed cache; nothing else to do.
  }
}

/** Remove receipt / loan deleted / loan 404: delete the loan folder. Failures are ignored. */
export function deleteLoanReceipts(userId: string, loanId: string): void {
  try {
    const dir = loanDir(userId, loanId);
    if (dir.exists) dir.delete();
  } catch {
    // Receipts are only ever shown for their own user and loan.
  }
}

/** After a confirmed account deletion: delete every receipt of that user on this device. */
export function deleteUserReceipts(userId: string): void {
  try {
    const dir = userDir(userId);
    if (dir.exists) dir.delete();
  } catch {
    // Ignored (§8): receipts are only ever shown for their own userId.
  }
}

/** Stores a freshly processed image as the pending receipt of an unsaved loan. */
export function setPendingReceipt(loanId: string, source: File): void {
  const pending = pendingReceipt(loanId);
  if (pending.exists) pending.delete();
  source.copySync(pending);
  try {
    source.delete();
  } catch {
    // The processed image is a cache file; the OS removes it eventually.
  }
}

export function pendingReceiptUri(loanId: string): string | null {
  const pending = pendingReceipt(loanId);
  return pending.exists ? pending.uri : null;
}
