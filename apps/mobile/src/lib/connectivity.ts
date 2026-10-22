/**
 * Tracks requests that have been waiting longer than 3 s, so the UI can show
 * "Connecting to MiniLedger…" during a cold start (design.md §9.1).
 */
import { useSyncExternalStore } from 'react';

let slowRequests = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function markSlow(): () => void {
  slowRequests += 1;
  emit();
  let done = false;
  return () => {
    if (done) return;
    done = true;
    slowRequests -= 1;
    emit();
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useIsConnectingSlowly(): boolean {
  return useSyncExternalStore(subscribe, () => slowRequests > 0);
}
