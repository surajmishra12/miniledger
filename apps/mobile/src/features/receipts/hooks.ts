import type { File } from 'expo-file-system';
import { useCallback, useState } from 'react';

import {
  deleteLoanReceipts,
  discardPendingReceipt,
  pendingReceiptUri,
  receiptUri,
  replaceReceipt,
  setPendingReceipt,
} from './storage';

type ReceiptState = { uri: string | null; version: number };

/** The saved receipt of an existing loan; the file itself is the source of truth (§8). */
export function useSavedReceipt(userId: string | undefined, loanId: string) {
  const [state, setState] = useState<ReceiptState>(() => ({
    uri: userId ? receiptUri(userId, loanId) : null,
    version: 0,
  }));

  const attach = useCallback(
    (file: File) => {
      if (!userId) return;
      replaceReceipt(userId, loanId, file);
      try {
        file.delete();
      } catch {
        // Cache file; the OS cleans it up.
      }
      setState((s) => ({ uri: receiptUri(userId, loanId), version: s.version + 1 }));
    },
    [userId, loanId],
  );

  const remove = useCallback(() => {
    if (userId) deleteLoanReceipts(userId, loanId);
    setState((s) => ({ uri: null, version: s.version + 1 }));
  }, [userId, loanId]);

  return { ...state, attach, remove };
}

/** The pending receipt of a loan that has not been saved yet. */
export function usePendingReceipt(loanId: string) {
  const [state, setState] = useState<ReceiptState>(() => ({
    uri: pendingReceiptUri(loanId),
    version: 0,
  }));

  const attach = useCallback(
    (file: File) => {
      setPendingReceipt(loanId, file);
      setState((s) => ({ uri: pendingReceiptUri(loanId), version: s.version + 1 }));
    },
    [loanId],
  );

  const remove = useCallback(() => {
    discardPendingReceipt(loanId);
    setState((s) => ({ uri: null, version: s.version + 1 }));
  }, [loanId]);

  return { ...state, attach, remove };
}
